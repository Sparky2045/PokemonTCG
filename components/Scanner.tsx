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

async function loadImage(file: File): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
  });
  return img;
}

function cropCanvas(img: HTMLImageElement, crop: { x: number; y: number; w: number; h: number }, scale = 2) {
  const c = document.createElement("canvas");
  c.width = Math.floor(crop.w * scale);
  c.height = Math.floor(crop.h * scale);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, c.width, c.height);

  // leichte Kontrastverstärkung
  const imageData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let v = (r * 0.299 + g * 0.587 + b * 0.114);
    v = (v - 128) * 1.4 + 128;
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  return c;
}

// versucht, aus OCR-Text eine plausible Pokémon-Karten-Namenszeile zu ziehen
function guessName(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // oft steht der Name allein in einer Zeile (z.B. "Regirock")
  // wir nehmen die längste "saubere" Zeile ohne Zahlen
  const candidates = lines
    .map((l) => l.replace(/[^A-Za-zÄÖÜäöüß'\- ]/g, " ").replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 3 && l.length <= 25)
    .filter((l) => !/\d/.test(l));

  if (!candidates.length) return "";

  // bevorzugt 1-Wort oder 2-Wort Namen
  candidates.sort((a, b) => {
    const aw = a.split(" ").length;
    const bw = b.split(" ").length;
    if (aw !== bw) return aw - bw; // weniger Wörter zuerst
    return b.length - a.length; // dann längere
  });

  return candidates[0];
}

export default function Scanner({ onClose, onCardAdded }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [error, setError] = useState("");
  const [debugText, setDebugText] = useState("");

  const eur = useMemo(() => eurFormat, []);

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    setResults([]);
    setDebugText("");
    setStatus("Erkennung läuft… (Name oben)");

    try {
      const Tesseract = await loadTesseract();
      const img = await loadImage(file);

      // Wir croppen den oberen Bereich (Name sitzt dort groß)
      // Bereich: obere ~18% der Karte, mittig etwas breiter
      const crop = {
        x: Math.floor(img.width * 0.08),
        y: Math.floor(img.height * 0.02),
        w: Math.floor(img.width * 0.84),
        h: Math.floor(img.height * 0.18),
      };

      const c = cropCanvas(img, crop, 2);
      const dataUrl = c.toDataURL("image/png");

      const ocr = await Tesseract.recognize(dataUrl, "eng");
      const rawText: string = ocr?.data?.text || "";
      setDebugText(rawText);

      const name = guessName(rawText);
      if (!name) {
        setStatus("");
        setError("Konnte den Kartennamen nicht lesen. Versuch: Karte gerade, Name oben klar im Bild.");
        return;
      }

      setStatus(`Name erkannt: "${name}" → Suche…`);

      // PokémonTCG Query: name:"Regirock"
      const cards = await searchCards(`name:"${name.replace(/"/g, '\\"')}"`);

      if (!cards.length) {
        setStatus("");
        setError(`Keine Treffer für "${name}".`);
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
          <h2 className="text-lg font-bold">Karte scannen</h2>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700">
            Schließen
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-3">
          PC: Datei auswählen. Handy: Kamera. Wir erkennen jetzt zuerst den <b>Namen oben</b> (stabiler als die Nummer).
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
