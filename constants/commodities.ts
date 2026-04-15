export type CommoditySymbol =
  | 'XAU'
  | 'XAG'
  | 'XPT'
  | 'XPD'
  | 'oil'
  | 'natural_gas'
  | 'copper';

export interface Commodity {
  symbol: CommoditySymbol;
  name: string;
  unit: string;
  color: string;
  emoji: string;
  /** key in the Metals.live response */
  apiKey: string;
}

export const COMMODITIES: Commodity[] = [
  {
    symbol: 'XAU',
    name: 'Gold',
    unit: 'troy oz',
    color: '#F5A623',
    emoji: '🥇',
    apiKey: 'gold',
  },
  {
    symbol: 'XAG',
    name: 'Silver',
    unit: 'troy oz',
    color: '#A8A8A8',
    emoji: '🥈',
    apiKey: 'silver',
  },
  {
    symbol: 'XPT',
    name: 'Platinum',
    unit: 'troy oz',
    color: '#E5E4E2',
    emoji: '💎',
    apiKey: 'platinum',
  },
  {
    symbol: 'XPD',
    name: 'Palladium',
    unit: 'troy oz',
    color: '#9090A0',
    emoji: '⚙️',
    apiKey: 'palladium',
  },
];

export const COMMODITY_MAP: Record<string, Commodity> = Object.fromEntries(
  COMMODITIES.map((c) => [c.symbol, c])
);
