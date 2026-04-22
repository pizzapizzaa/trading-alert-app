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

export type ChartRange = '1H' | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y';

interface RangeConfig {
  interval: string;
  /** Yahoo Finance range param (e.g. "1d", "3mo"). */
  range?: string;
  /** If set, use period1/period2 computed from now - offsetSec. */
  offsetSec?: number;
}

const RANGE_CONFIG: Record<ChartRange, RangeConfig> = {
  '1H':  { interval: '1m',  offsetSec: 3_600 },
  '1D':  { interval: '5m',  range: '1d' },
  '1W':  { interval: '1h',  range: '5d' },
  '1M':  { interval: '1d',  range: '1mo' },
  '3M':  { interval: '1d',  range: '3mo' },
  '6M':  { interval: '1wk', range: '6mo' },
  '1Y':  { interval: '1wk', range: '1y' },
  '3Y':  { interval: '1mo', offsetSec: 3 * 365 * 24 * 3_600 },
};

/**
 * Fetch historical price points for a given ChartRange.
 * Pulls from Yahoo Finance v8 chart API — no API key required.
 */
export async function fetchPriceHistoryForRange(
  yahooKey: string,
  chartRange: ChartRange
): Promise<HistoricalPoint[]> {
  const encoded = encodeURIComponent(yahooKey);
  const cfg = RANGE_CONFIG[chartRange];

  let url: string;
  if (cfg.offsetSec !== undefined) {
    const period2 = Math.floor(Date.now() / 1_000);
    const period1 = period2 - cfg.offsetSec;
    url = `${YAHOO_CHART_BASE}/${encoded}?period1=${period1}&period2=${period2}&interval=${cfg.interval}`;
  } else {
    url = `${YAHOO_CHART_BASE}/${encoded}?range=${cfg.range}&interval=${cfg.interval}`;
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Yahoo Finance HTTP ${response.status}`);

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No result from Yahoo Finance');

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  const points = timestamps
    .map((ts, i) => {
      const price = closes[i];
      if (price == null || isNaN(price)) return null;
      return { price, time: ts * 1_000 } as HistoricalPoint;
    })
    .filter((p): p is HistoricalPoint => p !== null);

  // For 1H, trim to the last 60 minutes of data
  if (chartRange === '1H') {
    const cutoff = Date.now() - 3_600_000;
    return points.filter((p) => p.time >= cutoff);
  }
  return points;
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
