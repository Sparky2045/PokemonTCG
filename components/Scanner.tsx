import React, { useMemo, useState } from "react";
import { PokemonCard } from "../types";
import { searchCards } from "../services/pokemonService";

async function loadTesseract() {
  const mod = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
  return (mod as any).default || (window as any).Tesseract;
}

type Props = {
  onClose: () => void;
  onCardAdded: (card: PokemonCard) => void;
};

function eurFormat(v: number) {
  return (v || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function canvasFromImage(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return c;
}

function rotateCanvas(src: HTMLCanvasElement, deg: 0 | 90 | 180 | 270) {
  if (deg === 0) return src;

  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const rad = (deg * Math.PI) / 180;

  if (deg === 90 || deg === 270) {
    c.width = src.height;
    c.height = src.width;
  } else {
    c.width = src.width;
    c.height = src.height;
  }

  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

// Crop-Bereiche: unten links / unten mitte / unten rechts
function cropZone(src: HTMLCanvasElement, zone: "bl" | "bm" | "br") {
  const w = src.width;
  const h = src.height;

  const cropH = Math.floor(h * 0.35); // unteres 35%
  const cropY = h - cropH;

  // wir nehmen nur ~55% Breite, je nach Zone verschoben
  const cropW = Math.floor(w * 0.55);
  let cropX = 0;
  if (zone === "bm") cropX = Math.floor((w - cropW) / 2);
  if (zone === "br") cropX = w - cropW;

  const scale = 2; // hochskalieren
  const c = document.createElement("canvas");
  c.width = cropW * scale;
  c.height = cropH * scale;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, c.width, c.height);

  // Grayscale + Kontrast (hilft extrem bei kleiner Schrift)
  const imageData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let v = (r * 0.299 + g * 0.587 + b * 0.114);
    v = (v - 128) * 1.5 + 128; // stärkerer Kontrast
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  return c;
}

function extractNumber(text: string) {
  // akzeptiert 082/159, 82/159, 082 / 159, etc.
  return text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
}

export default function Scanner({ onClose, onCardAdded }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [error, setError] = useState<string>("");
  const [debugText, setDebugText] = useState<string>("");

  const eur = useMemo(() => eurFormat, []);

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    setResults([]);
    setDebugText("");
    setStatus("OCR läuft… (mehrere Versuche)");

    try {
      const Tesseract = await loadTesseract();

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
      });

      const base = canvasFromImage(img);

      // Wir testen mehrere Rotationen + Zonen
      const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
      const zones: ("bl" | "bm" | "br")[] = ["bl", "bm", "br"];

      let found: RegExpMatchArray | null = null;
      let foundDebug = "";
      let bestTryLog = "";

      for (const deg of rotations) {
        const rotated = rotateCanvas(base, deg);

        for (const zone of zones) {
          const cropped = cropZone(rotated, zone);
          const dataUrl = cropped.toDataURL("image/png");

          // Wichtig: KEIN zu aggressives Whitelist-Setup, sonst kommt manchmal leer zurück.
          const r = await Tesseract.recognize(dataUrl, "eng");
          const text: string = r?.data?.text || "";
          const cleaned = text.replace(/[^\d\/\s]/g, ""); // wir filtern erst nachträglich

          bestTryLog += `\n--- try rotation=${deg} zone=${zone} ---\nRAW:\n${text}\nCLEAN:\n${cleaned}\n`;

          const m = extractNumber(cleaned);
          if (m) {
            found = m;
            foundDebug = `rotation=${deg}, zone=${zone}\n` + cleaned;
            break;
          }
        }
        if (found) break;
      }

      setDebugText(bestTryLog);

      if (!found) {
        setStatus("");
        setError(
          "Keine Kartennummer erkannt. Öffne 'OCR Debug anzeigen' und schick mir den Text – dann sehe ich, was OCR wirklich liest."
        );
        return;
      }

      const number = found[1]; // z.B. 082
      setStatus(`Erkannt: ${found[0]} (aus ${foundDebug}) → Suche nach number:${number} …`);

      const cards = await searchCards(`number:${number}`);
      if (!cards.length) {
        setStatus("");
        setError("Nummer erkannt, aber keine Treffer. (Kann passieren, wenn verschiedene Sets gleiche Nummern haben.)");
        return;
      }

      setResults(cards);
      setStatus("Treffer gefunden – bitte auswählen.");
    } catch (e: any) {
      setStatus("");
      setError(e?.message || "Scan fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-gray-900 border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Karte scannen (OCR)</h2>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700">
            Schließen
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-3">
          PC: Datei auswählen. Handy: Kamera. Der Scanner probiert jetzt automatisch Drehungen & Bereiche.
        </p>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="block w-full text-sm text-gray-200"
        />

        {status && <div className="mt-3 text-sm text-gray-200">{status}</div>}
        {error && <div className="mt-3 text-sm text-red-300">{error}</div>}

        {debugText && (
          <details className="mt-3 text-sm text-gray-300">
            <summary className="cursor-pointer">OCR Debug anzeigen</summary>
            <pre className="mt-2 p-2 rounded bg-black/30 overflow-auto whitespace-pre-wrap">{debugText}</pre>
          </details>
        )}

        <div className="mt-4 space-y-2 max-h-[50vh] overflow-auto">
          {results.map((c) => {
            const price =
              c.cardmarket?.prices?.trendPrice ??
              c.cardmarket?.prices?.averageSellPrice ??
              0;

            return (
              <button
                key={c.id}
                onClick={() => onCardAdded(c)}
                className="w-full text-left flex gap-3 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700"
              >
                <img src={c.images?.small} className="w-14 rounded-lg" />
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-sm text-gray-300">
                    {c.set?.name} • #{c.number} • {eur(Number(price))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
