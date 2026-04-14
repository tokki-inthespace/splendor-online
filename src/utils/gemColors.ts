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
  gold: { bg: '#FFC107', text: '#FFF' },
};

export const GEM_COLORS: GemColor[] = ['white', 'blue', 'green', 'red', 'black'];

/**
 * 토큰 개수 숫자에 적용할 text-shadow.
 * - 흰 보석: 그림자 없음 (보석 면이 밝고 깨끗해서 그림자가 얼룩으로 보임)
 * - 밝은 텍스트(#FFF): 어두운 그림자 — 유색 보석 위 가독성 확보
 * - 어두운 텍스트(#333, 골드): 밝은 그림자
 */
export function getTokenCountShadow(color: TokenColor): string {
  if (color === 'white') return 'none';
  const textColor = TOKEN_STYLE[color].text.toLowerCase();
  return textColor === '#fff'
    ? '0 1px 2px rgba(0,0,0,0.7)'
    : '0 1px 2px rgba(255,255,255,0.85)';
}

/** 토큰 선택을 읽기 쉬운 문자열로 변환 (예: "white, blue x2") */
export function describeTokens(tokens: Partial<Record<GemColor, number>>): string {
  return Object.entries(tokens)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([color, n]) => n! > 1 ? `${color} x${n}` : color)
    .join(', ');
}
