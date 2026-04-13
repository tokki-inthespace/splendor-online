import { useEffect, useState } from 'react';

/**
 * 일러스트 매니페스트.
 * public/illustrations/manifest.json에서 로드한 "존재하는 일러스트 ID" 집합.
 * 매니페스트에 등록되지 않은 이미지는 로드 시도 자체를 하지 않아 404 로그를 막는다.
 */
interface Manifest {
  cards: Set<string>;
  nobles: Set<string>;
  cardBacks: Set<string>;
}

let manifest: Manifest = {
  cards: new Set(),
  nobles: new Set(),
  cardBacks: new Set(),
};
let loaded = false;
const listeners = new Set<() => void>();

// 앱 로드 시 한 번 fetch
fetch('/illustrations/manifest.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    if (data) {
      manifest = {
        cards: new Set(data.cards ?? []),
        nobles: new Set(data.nobles ?? []),
        cardBacks: new Set(data.cardBacks ?? []),
      };
    }
    loaded = true;
    listeners.forEach((l) => l());
  })
  .catch(() => {
    loaded = true;
    listeners.forEach((l) => l());
  });

export function hasCardArt(id: string): boolean {
  return manifest.cards.has(id);
}

export function hasNobleArt(id: string): boolean {
  return manifest.nobles.has(id);
}

export function hasCardBackArt(level: 1 | 2 | 3): boolean {
  return manifest.cardBacks.has(`l${level}`);
}

/**
 * 매니페스트 로드 완료 시 해당 컴포넌트를 리렌더하기 위한 훅.
 * Art 컴포넌트는 이걸 호출해서 로드 전에는 렌더 안 하고, 로드 후 자동 반영.
 */
export function useArtManifest(): boolean {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (loaded) return;
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return loaded;
}
