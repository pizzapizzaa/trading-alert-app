import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CommoditySymbol } from '@/constants/commodities';
import { COMMODITIES } from '@/constants/commodities';
import type { PriceData, ChartRange } from '@/services/priceService';
import { fetchPriceHistoryForRange } from '@/services/priceService';

export interface PricePoint {
  price: number;
  time: number;
}

export type PriceHistory = Partial<Record<CommoditySymbol, PricePoint[]>>;

/** Ranges where live intraday appending makes sense */
const LIVE_RANGES: ChartRange[] = ['1H', '1D'];

/** Stale times per range — shorter ranges refresh more often */
const STALE_MS: Record<ChartRange, number> = {
  '1H':  5  * 60 * 1_000,
  '1D':  15 * 60 * 1_000,
  '1W':  60 * 60 * 1_000,
  '1M':  60 * 60 * 1_000,
  '3M':  4  * 60 * 60 * 1_000,
  '6M':  4  * 60 * 60 * 1_000,
  '1Y':  24 * 60 * 60 * 1_000,
  '3Y':  24 * 60 * 60 * 1_000,
};

async function fetchAllHistory(range: ChartRange): Promise<PriceHistory> {
  const results = await Promise.allSettled(
    COMMODITIES.map((c) =>
      fetchPriceHistoryForRange(c.yahooKey, range).then((points) => ({
        symbol: c.symbol,
        points,
      }))
    )
  );

  const history: PriceHistory = {};
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.points.length > 0) {
      history[result.value.symbol] = result.value.points;
    }
  }
  return history;
}

/**
 * Returns price history per commodity for the given ChartRange.
 * For '1H' and '1D' ranges, live intraday points from `prices` are appended.
 */
export function usePriceHistory(
  prices: PriceData[] | undefined,
  range: ChartRange = '1W'
): PriceHistory {
  const { data: baseHistory = {} } = useQuery<PriceHistory>({
    queryKey: ['priceHistory', range],
    queryFn: () => fetchAllHistory(range),
    staleTime: STALE_MS[range],
    retry: 2,
  });

  const [livePoints, setLivePoints] = useState<PriceHistory>({});

  // Reset live points whenever range changes
  useEffect(() => {
    setLivePoints({});
  }, [range]);

  useEffect(() => {
    if (!prices?.length) return;
    if (!LIVE_RANGES.includes(range)) return;

    setLivePoints((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const p of prices) {
        if (!p.price) continue;
        const existing = next[p.symbol] ?? [];
        const last = existing[existing.length - 1];
        if (!last || last.price !== p.price) {
          next[p.symbol] = [...existing, { price: p.price, time: Date.now() }].slice(-200);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [prices, range]);

  // Merge: historical base + live intraday points
  const merged: PriceHistory = {};
  const allSymbols = new Set([
    ...Object.keys(baseHistory),
    ...Object.keys(livePoints),
  ]) as Set<CommoditySymbol>;

  for (const symbol of allSymbols) {
    const base = baseHistory[symbol] ?? [];
    const live = livePoints[symbol] ?? [];
    merged[symbol] = LIVE_RANGES.includes(range) ? [...base, ...live] : base;
  }

  return merged;
}

