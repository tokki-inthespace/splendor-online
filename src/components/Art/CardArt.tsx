import { useState } from 'react';
import type { Card } from '../../types/game';
import { getCardImageUrl } from '../../utils/cardArt';
import { hasCardArt, useArtManifest } from '../../utils/artManifest';

interface Props {
  card: Card;
}

/**
 * 카드 일러스트. manifest에 등록된 카드만 로드. 이미지 로드 실패 시 자가 숨김.
 */
export function CardArt({ card }: Props) {
  useArtManifest(); // 매니페스트 로드 완료 시 리렌더 트리거
  const [errored, setErrored] = useState(false);
  if (errored || !hasCardArt(card.id)) return null;
  return (
    <img
      src={getCardImageUrl(card)}
      alt=""
      className="card-art"
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
    />
  );
}
