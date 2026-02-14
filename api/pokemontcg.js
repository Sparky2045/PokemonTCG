export default async function handler(req, res) {
  const key = process.env.POKEMONTCG_API_KEY;
  if (!key) return res.status(500).json({ error: "POKEMONTCG_API_KEY missing" });

  const { q, id } = req.query;

  let url = "https://api.pokemontcg.io/v2/cards";
  if (id) url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(id)}`;
  if (q) url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=25`;

  const r = await fetch(url, { headers: { "X-Api-Key": key } });
  const text = await r.text();
  res.status(r.status).send(text);
}
