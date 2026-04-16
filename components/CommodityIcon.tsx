import React from 'react';
import { Coins, Drop, Wind, Cube } from 'phosphor-react-native';
import type { IconProps } from 'phosphor-react-native';

interface CommodityIconProps {
  symbol: string;
  size?: number;
  color?: string;
  weight?: IconProps['weight'];
}

type PhosphorIcon = React.ComponentType<IconProps>;

const ICON_MAP: Record<string, PhosphorIcon> = {
  XAU: Coins,
  XAG: Coins,
  XPT: Coins,
  XPD: Coins,
  oil: Drop,
  natural_gas: Wind,
  copper: Cube,
};

export function CommodityIcon({ symbol, size = 24, color, weight = 'regular' }: CommodityIconProps) {
  const IconComponent: PhosphorIcon = ICON_MAP[symbol] ?? Coins;
  return <IconComponent size={size} color={color} weight={weight} />;
}
