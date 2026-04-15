import { useQuery } from '@tanstack/react-query';
import { fetchPrices, type PriceData } from '@/services/priceService';

export function usePrices(refetchIntervalMs = 30_000) {
  return useQuery<PriceData[]>({
    queryKey: ['prices'],
    queryFn: fetchPrices,
    refetchInterval: refetchIntervalMs,
    staleTime: 20_000,
    retry: 2,
  });
}

export function usePriceForSymbol(symbol: string, refetchIntervalMs = 30_000) {
  const query = usePrices(refetchIntervalMs);
  const priceData = query.data?.find((p) => p.symbol === symbol) ?? null;
  return { ...query, priceData };
}
