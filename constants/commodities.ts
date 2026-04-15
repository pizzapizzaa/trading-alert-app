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
  /** Reserved for future SVG icon — set to empty string until icons are provided */
  icon: string;
  /** Yahoo Finance futures ticker */
  yahooKey: string;
}

export const COMMODITIES: Commodity[] = [
  {
    symbol: 'XAU',
    name: 'Gold',
    unit: 'troy oz',
    color: '#F5A623',
    icon: '',
    yahooKey: 'GC=F',
  },
  {
    symbol: 'XAG',
    name: 'Silver',
    unit: 'troy oz',
    color: '#A8A8A8',
    icon: '',
    yahooKey: 'SI=F',
  },
  {
    symbol: 'XPT',
    name: 'Platinum',
    unit: 'troy oz',
    color: '#E5E4E2',
    icon: '',
    yahooKey: 'PL=F',
  },
  {
    symbol: 'XPD',
    name: 'Palladium',
    unit: 'troy oz',
    color: '#9090A0',
    icon: '',
    yahooKey: 'PA=F',
  },
  {
    symbol: 'oil',
    name: 'Crude Oil',
    unit: 'barrel',
    color: '#4A3224',
    icon: '',
    yahooKey: 'CL=F',
  },
];

export const COMMODITY_MAP: Record<string, Commodity> = Object.fromEntries(
  COMMODITIES.map((c) => [c.symbol, c])
);
