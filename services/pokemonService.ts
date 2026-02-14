import { PokemonCard } from "../types";

export async function searchCards(query: string): Promise<PokemonCard[]> {
  const r = await fetch(`/api/pokemontcg?q=${encodeURIComponent(query)}`);
  if (!r.ok) throw new Error(await r.text());
  const json = await r.json();
  return json?.data ?? [];
}

export async function getCardById(id: string): Promise<PokemonCard> {
  const r = await fetch(`/api/pokemontcg?id=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(await r.text());
  const json = await r.json();
  return json?.data;
}
