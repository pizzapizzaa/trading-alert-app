import { COMMODITIES, type CommoditySymbol } from '@/constants/commodities';

export interface PriceData {
  symbol: CommoditySymbol;
  name: string;
  price: number;
  previousPrice: number | null;
  change: number;
  changePercent: number;
  high24h: number | null;
  low24h: number | null;
  lastUpdated: string;
}

// Metals.live free API – returns an array of single-key objects:
// [ { "gold": 2000 }, { "silver": 23.5 }, ... ]
const METALS_API_URL = 'https://metals.live/api/v1/latest';

let cachedPrices: Record<string, number> = {};

/**
 * Fetch current metal spot prices from metals.live.
 * Falls back to cached values if the network request fails.
 */
export async function fetchPrices(): Promise<PriceData[]> {
  let rawPrices: Record<string, number> = {};

  try {
    const response = await fetch(METALS_API_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json: Array<Record<string, number>> = await response.json();

    // Normalise [ { gold: 2000 }, { silver: 23 } ] → { gold: 2000, silver: 23 }
    json.forEach((entry) => {
      Object.assign(rawPrices, entry);
    });
  } catch (err) {
    console.warn('[PriceService] Fetch failed, using cached values:', err);
    rawPrices = { ...cachedPrices };
    if (Object.keys(rawPrices).length === 0) {
      // Return empty array so callers know data is unavailable
      return [];
    }
  }

  const now = new Date().toISOString();
  const results: PriceData[] = COMMODITIES.map((commodity) => {
    const price = rawPrices[commodity.apiKey] ?? 0;
    const previousPrice = cachedPrices[commodity.apiKey] ?? null;
    const change = previousPrice !== null ? price - previousPrice : 0;
    const changePercent =
      previousPrice && previousPrice !== 0
        ? (change / previousPrice) * 100
        : 0;

    return {
      symbol: commodity.symbol,
      name: commodity.name,
      price,
      previousPrice,
      change,
      changePercent,
      high24h: null,
      low24h: null,
      lastUpdated: now,
    };
  });

  // Update cache
  COMMODITIES.forEach((c) => {
    if (rawPrices[c.apiKey] !== undefined) {
      cachedPrices[c.apiKey] = rawPrices[c.apiKey];
    }
  });

  return results;
}

export function formatPrice(
  price: number,
  symbol: CommoditySymbol
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatChange(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${amount.toFixed(2)}`;
}

export function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
