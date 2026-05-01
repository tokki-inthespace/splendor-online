// 효과음 매니저 — HTMLAudio 기반, mute 상태 localStorage 영속화

const STORAGE_KEY = 'splendor-sound-muted';

export type SoundName =
  | 'takeTokens'
  | 'purchase'
  | 'reserve'
  | 'myTurn'
  | 'noble'
  | 'win'
  | 'lose';

const SOUND_FILES: Record<SoundName, string> = {
  takeTokens: '/sounds/take-tokens.wav',
  purchase: '/sounds/purchase.wav',
  reserve: '/sounds/reserve.mp3',
  myTurn: '/sounds/my-turn.wav',
  noble: '/sounds/noble.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.ogg',
};

const audioCache = new Map<SoundName, HTMLAudioElement>();
const listeners = new Set<() => void>();

let muted = false;
try {
  muted = localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  // localStorage 비활성 환경 — 기본값 false 유지
}

function getAudio(name: SoundName): HTMLAudioElement {
  let audio = audioCache.get(name);
  if (!audio) {
    audio = new Audio(SOUND_FILES[name]);
    audio.preload = 'auto';
    audioCache.set(name, audio);
  }
  return audio;
}

export function playSound(name: SoundName): void {
  if (muted) return;
  const base = getAudio(name);
  // 같은 사운드의 연속 재생을 위해 cloneNode 사용
  const clone = base.cloneNode(true) as HTMLAudioElement;
  clone.volume = base.volume;
  void clone.play().catch(() => {
    // 사용자 인터랙션 전 자동재생 차단 등은 조용히 무시
  });
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // 영속화 실패 — 세션 동안만 적용
  }
  listeners.forEach((l) => l());
}

export function subscribeMute(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
