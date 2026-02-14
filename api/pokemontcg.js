export default async function handler(req, res) {
  const key = process.env.POKEMONTCG_API_KEY;
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (!key) {
    return res.status(500).json({ ok: false, error: "POKEMONTCG_API_KEY missing" });
  }

  const { q, id } = req.query;

  let url = "https://api.pokemontcg.io/v2/cards";
  if (id) url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(id)}`;
  if (q) url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=10`;

  try {
    // Timeout nach 10s
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);

    const r = await fetch(url, {
      headers: { "X-Api-Key": key },
      signal: controller.signal,
    });

    clearTimeout(t);

    const text = await r.text();

    // Wenn die API kein JSON liefert (z.B. Cloudflare HTML), geben wir sauberes JSON zurück
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return res.status(502).json({
        ok: false,
        error: "Upstream did not return JSON",
        upstreamStatus: r.status,
        contentType: ct,
        sample: text.slice(0, 200),
      });
    }

    // JSON durchreichen, aber immer ok-Flag hinzufügen
    const json = JSON.parse(text);
    return res.status(r.status).json({ ok: r.ok, ...json });
  } catch (e) {
    // AbortController oder Netzwerkfehler
    return res.status(504).json({
      ok: false,
      error: "Upstream timeout or fetch failed",
      details: String(e?.message || e),
    });
  }
}
