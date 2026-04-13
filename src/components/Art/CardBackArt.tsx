import { useState } from 'react';
import { getCardBackImageUrl } from '../../utils/cardArt';
import { hasCardBackArt, useArtManifest } from '../../utils/artManifest';

interface Props {
  level: 1 | 2 | 3;
}

/**
 * 덱 뒷면 일러스트. manifest에 등록된 레벨만 로드. 이미지 로드 실패 시 자가 숨김.
 */
export function CardBackArt({ level }: Props) {
  useArtManifest();
  const [errored, setErrored] = useState(false);
  if (errored || !hasCardBackArt(level)) return null;
  return (
    <img
      src={getCardBackImageUrl(level)}
      alt=""
      className="card-back-art"
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
    />
  );
}
