import { useState } from 'react';
import type { TokenColor } from '../../types/game';
import { TOKEN_STYLE } from '../../utils/gemColors';
import { hasGemArt, useArtManifest } from '../../utils/artManifest';

interface Props {
  color: TokenColor;
  /** 추가 클래스. 크기/위치는 호출 측 CSS에서 지정 */
  className?: string;
}

/**
 * 보석 아이콘.
 * - manifest.gems에 등록된 색상은 `/illustrations/gems/{color}.png`로 렌더
 *   (투명 배경 유지를 위해 WebP 대신 PNG 사용)
 * - 등록되지 않았거나 로드 실패 시 색상 원형(기존 스타일)로 폴백
 *
 * 크기/배치는 호출 측에서 className/CSS로 제어.
 */
export function GemIcon({ color, className = '' }: Props) {
  useArtManifest();
  const [errored, setErrored] = useState(false);
  const showArt = !errored && hasGemArt(color);

  return (
    <span
      className={`gem-icon ${showArt ? 'gem-icon--art' : 'gem-icon--fallback'} ${className}`}
      style={showArt ? undefined : { backgroundColor: TOKEN_STYLE[color].bg }}
      aria-hidden
    >
      {showArt && (
        <img
          src={`/illustrations/gems/${color}.png`}
          alt=""
          className="gem-icon-img"
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
        />
      )}
    </span>
  );
}
