export const Colors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  border: '#2E2E2E',
  borderLight: '#3A3A3A',

  gold: '#F5A623',
  goldLight: '#FFD580',
  goldDark: '#C17D0A',

  silver: '#A8A8A8',
  platinum: '#E5E4E2',
  palladium: '#9090A0',

  green: '#2ECC71',
  greenDark: '#27AE60',
  red: '#E74C3C',
  redDark: '#C0392B',
  orange: '#F39C12',

  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof Colors;
