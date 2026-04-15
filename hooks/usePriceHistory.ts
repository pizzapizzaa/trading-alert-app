import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CommoditySymbol } from '@/constants/commodities';
import { COMMODITIES } from '@/constants/commodities';
import type { PriceData } from '@/services/priceService';
import { fetchPriceHistory } from '@/services/priceService';

export interface PricePoint {
  price: number;
  time: number;
}

export type PriceHistory = Partial<Record<CommoditySymbol, PricePoint[]>>;

/** Fetches 7-day daily close prices for all commodities from stooq.com */
async function fetchAllHistory(): Promise<PriceHistory> {
  const results = await Promise.allSettled(
    COMMODITIES.map((c) =>
      fetchPriceHistory(c.yahooKey, 10).then((points) => ({
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
 * Returns price history per commodity:
 * - Base: real 7-day daily close prices fetched from stooq.com on mount
 * - Live: intraday points appended every time `prices` updates (every ~30s)
 */
export function usePriceHistory(prices: PriceData[] | undefined): PriceHistory {
  const { data: baseHistory = {} } = useQuery<PriceHistory>({
    queryKey: ['priceHistory7d'],
    queryFn: fetchAllHistory,
    staleTime: 60 * 60 * 1_000, // re-fetch at most once per hour
    retry: 2,
  });

  const [livePoints, setLivePoints] = useState<PriceHistory>({});

  useEffect(() => {
    if (!prices?.length) return;

    setLivePoints((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const p of prices) {
        if (!p.price) continue;
        const existing = next[p.symbol] ?? [];
        const last = existing[existing.length - 1];
        if (!last || last.price !== p.price) {
          next[p.symbol] = [...existing, { price: p.price, time: Date.now() }].slice(-50);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [prices]);

  // Merge: historical base (daily) + live intraday points
  const merged: PriceHistory = {};
  const allSymbols = new Set([
    ...Object.keys(baseHistory),
    ...Object.keys(livePoints),
  ]) as Set<CommoditySymbol>;

  for (const symbol of allSymbols) {
    const base = baseHistory[symbol] ?? [];
    const live = livePoints[symbol] ?? [];
    merged[symbol] = [...base, ...live];
  }

  return merged;
}

