// SCANNER OCR VERSION - 123

import React, { useMemo, useState } from "react";
import { PokemonCard } from "../types";
import { searchCards } from "../services/pokemonService";

// OCR wird nur geladen, wenn du wirklich scannst
async function loadTesseract() {
  const mod = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
  return (mod as any).default || (window as any).Tesseract;
}

type Props = {
  onClose: () => void;
  onCardAdded: (card: PokemonCard) => void;
};

export default function Scanner({ onClose, onCardAdded }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [error, setError] = useState<string>("");

  const eur = useMemo(
    () => (v: number) => (v || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" }),
    []
  );

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    setResults([]);
    setStatus("OCR läuft… (10–30s)");

    try {
      const Tesseract = await loadTesseract();
      const imgUrl = URL.createObjectURL(file);

      const { data } = await Tesseract.recognize(imgUrl, "eng");
      const text: string = data?.text || "";

      // Suche nach Muster 80/198 oder 80 / 198
      const m = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
      if (!m) {
        setStatus("");
        setError("Keine Kartennummer erkannt. Versuch ein schärferes Foto (Nummer unten gut sichtbar).");
        return;
      }

      const number = m[1];
      setStatus(`Erkannt: ${m[0]} → Suche nach number:${number} …`);

      // Breite Suche nach number
      const cards = await searchCards(`number:${number}`);
      if (!cards.length) {
        setStatus("");
        setError("Keine Treffer. Versuch nochmal oder nutze später die manuelle Suche.");
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
          Tipp: Karte nah ran, gute Beleuchtung, Nummer unten muss scharf sein.
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
