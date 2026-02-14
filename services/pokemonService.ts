import { PokemonCard } from "../types";

async function fetchJson(url: string) {
  const r = await fetch(url);
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();

  if (!ct.includes("application/json")) {
    throw new Error("Server returned non-JSON (probably timeout).");
  }

  const json = JSON.parse(text);

  if (!r.ok || json?.ok === false) {
    throw new Error(json?.error || `API error ${r.status}`);
  }

  return json;
}

export async function searchCards(query: string): Promise<PokemonCard[]> {
  // 👇 Query enger machen (extrem wichtig)
  const safeQuery = `${query} supertype:pokemon`;

  const json = await fetchJson(
    `/api/pokemontcg?q=${encodeURIComponent(safeQuery)}`
  );

  return json?.data ?? [];
}

