import { useState } from 'react';
import type { Noble } from '../../types/game';
import { getNobleImageUrl } from '../../utils/cardArt';
import { hasNobleArt, useArtManifest } from '../../utils/artManifest';

interface Props {
  noble: Noble;
}

/**
 * 귀족 일러스트. manifest에 등록된 귀족만 로드. 이미지 로드 실패 시 자가 숨김.
 */
export function NobleArt({ noble }: Props) {
  useArtManifest();
  const [errored, setErrored] = useState(false);
  if (errored || !hasNobleArt(noble.id)) return null;
  return (
    <img
      src={getNobleImageUrl(noble)}
      alt=""
      className="noble-art"
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
    />
  );
}
