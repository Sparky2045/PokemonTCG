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

// Bild vorbereiten: unteren Bereich croppen + hochskalieren + Kontrast (simple)
async function preprocessBottomCrop(file: File): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
  });

  // Crop: untere ~32% der Karte (da sitzt die Nummer)
  const cropY = Math.floor(img.height * 0.68);
  const cropH = img.height - cropY;
  const cropW = img.width;

  // Hochskalieren x2 für OCR
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = cropW * scale;
  canvas.height = cropH * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

  // Simple Kontrast/Grayscale (hilft bei Glanz)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // grayscale
    let v = (r * 0.299 + g * 0.587 + b * 0.114);
    // contrast boost
    v = (v - 128) * 1.35 + 128;
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
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
    setStatus("OCR läuft… (10–30s)");

    try {
      const Tesseract = await loadTesseract();

      // 1) Bild vorbereiten (unten croppen + verbessern)
      const canvas = await preprocessBottomCrop(file);
      const dataUrl = canvas.toDataURL("image/png");

      // 2) OCR mit Whitelist nur für Nummern + Slash
      const result = await Tesseract.recognize(dataUrl, "eng", {
        tessedit_char_whitelist: "0123456789/",
        // PSM 6: block of text; PSM 7: single line (manchmal besser)
        tessedit_pageseg_mode: "6",
      });

      const text: string = result?.data?.text || "";
      setDebugText(text);

      // robustere Regex: findet 082/159 auch mit Leerzeichen oder Zeilenumbrüchen
      const m = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
      if (!m) {
        setStatus("");
        setError("Keine Kartennummer erkannt. Tipp: Karte gerade halten, Glanz vermeiden, Nummer unten muss scharf sein.");
        return;
      }

      const number = m[1]; // z.B. "082"
      setStatus(`Erkannt: ${m[0]} → Suche nach number:${number} …`);

      // 3) Suche
      const cards = await searchCards(`number:${number}`);
      if (!cards.length) {
        setStatus("");
        setError("Nummer erkannt, aber keine Treffer. (Kann passieren, wenn mehrere Sets gleiche Nummern haben.)");
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
          PC: Datei auswählen. Handy: sollte Kamera öffnen. Tipp: Glanz vermeiden, Nummer unten scharf.
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

        {/* Debug: zeigt was OCR wirklich gelesen hat */}
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
