
export interface PokemonCard {
  id: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    id: string;
    name: string;
    series: string;
  };
  cardmarket?: {
    prices: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
      avg1?: number; // 1-day average
      avg7?: number; // 7-day average
      avg30?: number; // 30-day average
    };
  };
}

export interface IdentifiedCard {
  name: string | null;
  set: string | null;
}
