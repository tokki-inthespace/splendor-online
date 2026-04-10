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

/** 토큰 선택을 읽기 쉬운 문자열로 변환 (예: "white, blue x2") */
export function describeTokens(tokens: Partial<Record<GemColor, number>>): string {
  return Object.entries(tokens)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([color, n]) => n! > 1 ? `${color} x${n}` : color)
    .join(', ');
}
