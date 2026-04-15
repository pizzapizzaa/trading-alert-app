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

const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * Fetch the current spot price for a single commodity via Yahoo Finance.
 * Uses the chart endpoint's `meta` block which always contains `regularMarketPrice`
 * and `chartPreviousClose` regardless of market hours.
 */
async function fetchYahooPrice(
  yahooKey: string
): Promise<{ price: number; previousClose: number }> {
  const encoded = encodeURIComponent(yahooKey);
  const url = `${YAHOO_CHART_BASE}/${encoded}?range=1d&interval=1m`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) throw new Error(`Yahoo Finance HTTP ${response.status}`);

  const json = await response.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No meta in Yahoo Finance response for ${yahooKey}`);

  const price: number = meta.regularMarketPrice ?? 0;
  const previousClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;

  return { price, previousClose };
}

/**
 * Fetch current spot prices for all commodities in parallel via Yahoo Finance.
 */
export async function fetchPrices(): Promise<PriceData[]> {
  const now = new Date().toISOString();

  const results = await Promise.allSettled(
    COMMODITIES.map((commodity) =>
      fetchYahooPrice(commodity.yahooKey).then(({ price, previousClose }) => {
        const change = price - previousClose;
        const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

        return {
          symbol: commodity.symbol,
          name: commodity.name,
          price,
          previousPrice: previousClose,
          change,
          changePercent,
          high24h: null,
          low24h: null,
          lastUpdated: now,
        } satisfies PriceData;
      })
    )
  );

  const priceData: PriceData[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      priceData.push(result.value);
    } else {
      console.warn('[PriceService] Failed to fetch price:', result.reason);
    }
  }

  return priceData;
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

export interface HistoricalPoint {
  price: number;
  time: number; // Unix ms
}

/**
 * Fetches 7-day daily close prices from Yahoo Finance (no API key required).
 * Uses the v8 chart API with 1d interval and 10d range to cover weekends.
 *
 * yahooKey examples: "GC=F" (gold), "SI=F" (silver), "PL=F" (platinum), "PA=F" (palladium)
 */
export async function fetchPriceHistory(
  yahooKey: string,
  _days = 10
): Promise<HistoricalPoint[]> {
  const encoded = encodeURIComponent(yahooKey);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=10d&interval=1d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) throw new Error(`Yahoo Finance HTTP ${response.status}`);

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No result from Yahoo Finance');

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((ts, i) => {
      const price = closes[i];
      if (price == null || isNaN(price)) return null;
      return { price, time: ts * 1000 } as HistoricalPoint;
    })
    .filter((p): p is HistoricalPoint => p !== null);
}

export function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
