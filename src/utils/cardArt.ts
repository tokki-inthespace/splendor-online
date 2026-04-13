import type { Card, Noble } from '../types/game';

/**
 * 카드 일러스트 URL.
 * 파일은 `public/illustrations/cards/{id}.webp` 에 위치.
 * 파일이 없으면 <img onError>로 숨김 처리되어 기존 UI fallback.
 */
export function getCardImageUrl(card: Card): string {
  return `/illustrations/cards/${card.id}.webp`;
}

/**
 * 덱 뒷면 일러스트 URL (레벨별).
 * 파일: `public/illustrations/cards/back/l{level}.webp`
 */
export function getCardBackImageUrl(level: 1 | 2 | 3): string {
  return `/illustrations/cards/back/l${level}.webp`;
}

/**
 * 귀족 일러스트 URL.
 * 파일: `public/illustrations/nobles/{id}.webp`
 */
export function getNobleImageUrl(noble: Noble): string {
  return `/illustrations/nobles/${noble.id}.webp`;
}
