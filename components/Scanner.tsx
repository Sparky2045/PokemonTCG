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

// Extra robust: 082/159, 82/159, 082-159, 82_159
function findNumberPair(text: string) {
  return text.match(/(\d{1,3})\s*[/\-_]\s*(\d{1,3})/);
}

export default function Scanner({ onClose, onCardAdded }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [error, setError] = useState<string>("");

  // manuelle Eingabe
  const [manualNum, setManualNum] = useState("");
  const [manualTotal, setManualTotal] = useState("");

  const eur = useMemo(() => eurFormat, []);

  async function runSearchByNumber(num: string, total?: string) {
    setBusy(true);
    setError("");
    setResults([]);
    try {
      // Wenn wir total haben: versuch erst eng (weniger Treffer)
      if (total) {
        // printedTotal ist häufig korrekt; total ist ein Fallback
        const tight = await searchCards(`number:${num} (set.printedTotal:${total} OR set.total:${total})`);
        if (tight.length) {
          setResults(tight);
          setStatus("Treffer gefunden – bitte auswählen.");
          return;
        }
      }

      // sonst / falls eng nix: breite Suche nur nach Nummer
      const cards = await searchCards(`number:${num}`);
      if (!cards.length) {
        setStatus("");
        setError("Nummer erkannt/eingegeben, aber keine Treffer.");
        return;
      }
      setResults(cards);
      setStatus("Treffer gefunden – bitte auswählen.");
    } catch (e: any) {
      setStatus("");
      setError(e?.message || "Suche fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    setResults([]);
    setStatus("Erkennung läuft…");

    // 1) Fallback aus Dateiname (bei dir funktioniert das direkt)
    const fromName = findNumberPair(file.name);
    if (fromName) {
      const num = fromName[1];
      const total = fromName[2];
      setStatus(`Aus Dateiname erkannt: ${num}/${total} → Suche…`);
      setManualNum(num);
      setManualTotal(total);
      await runSearchByNumber(num, total);
      return;
    }

    // 2) OCR (nur wenn Dateiname nix hergibt)
    try {
      setStatus("OCR läuft… (kann 10–30s dauern)");
      const Tesseract = await loadTesseract();

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const { data } = await Tesseract.recognize(canvas.toDataURL("image/png"), "eng");
      const text: string = data?.text || "";

      const m = findNumberPair(text);
      if (!m) {
        setStatus("");
        setError("Keine Kartennummer erkannt. Tipp: oder nutze die manuelle Eingabe unten.");
        return;
      }

      const num = m[1];
      const total = m[2];
      setStatus(`OCR erkannt: ${num}/${total} → Suche…`);
      setManualNum(num);
      setManualTotal(total);
      await runSearchByNumber(num, total);
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
          PC: Datei auswählen. Handy: sollte Kamera öffnen.
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

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
            placeholder="Nummer (z.B. 082)"
            value={manualNum}
            onChange={(e) => setManualNum(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
            placeholder="Total (z.B. 159)"
            value={manualTotal}
            onChange={(e) => setManualTotal(e.target.value)}
          />
          <button
            disabled={busy || !manualNum.trim()}
            onClick={() => runSearchByNumber(manualNum.trim(), manualTotal.trim() || undefined)}
            className="px-4 py-2 rounded-lg bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-500 disabled:opacity-50"
          >
            Suchen
          </button>
        </div>

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
