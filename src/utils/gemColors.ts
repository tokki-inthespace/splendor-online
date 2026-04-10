import type { GemColor, TokenColor } from '../types/game';

export const GEM_STYLE: Record<GemColor, { bg: string; text: string }> = {
  white: { bg: '#E8E8E8', text: '#333' },
  blue:  { bg: '#1565C0', text: '#FFF' },
  green: { bg: '#2E7D32', text: '#FFF' },
  red:   { bg: '#C62828', text: '#FFF' },
  black: { bg: '#37474F', text: '#FFF' },
};

export const TOKEN_STYLE: Record<TokenColor, { bg: string; text: string }> = {
  ...GEM_STYLE,
  gold: { bg: '#FFC107', text: '#333' },
};

export const GEM_COLORS: GemColor[] = ['white', 'black', 'red', 'blue', 'green'];
