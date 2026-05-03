import { useGameStore } from './store/gameStore';
import { ALL_CARDS, ALL_NOBLES } from './game/cardData';
import type { Card, GameState, GemColor, Noble } from './types/game';

type Who = 'me' | 'ai';

function withState(mut: (state: GameState) => void) {
  const s = useGameStore.getState();
  if (!s.gameState) {
    console.warn('[devGame] 게임이 시작되지 않았습니다. 먼저 게임을 시작해주세요.');
    return;
  }
  const next: GameState = JSON.parse(JSON.stringify(s.gameState));
  mut(next);
  useGameStore.setState({ gameState: next });
}

function targetIndex(who: Who): number {
  return who === 'me' ? 0 : 1;
}

function uniqueId(prefix: string): string {
  return `dev_${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function pickRandomCard(level?: 1 | 2 | 3, color?: GemColor): Card {
  const pool = ALL_CARDS.filter(
    c => (!level || c.level === level) && (!color || c.color === color)
  );
  const src = pool[Math.floor(Math.random() * pool.length)] ?? ALL_CARDS[0];
  return { ...src, id: uniqueId('card') };
}

function pickRandomNoble(): Noble {
  const src = ALL_NOBLES[Math.floor(Math.random() * ALL_NOBLES.length)];
  return { ...src, id: uniqueId('noble') };
}

const devGame = {
  giveNoble(n = 1, who: Who = 'me') {
    withState(state => {
      const p = state.players[targetIndex(who)];
      for (let i = 0; i < n; i++) p.nobles.push(pickRandomNoble());
    });
    console.info(`[devGame] +${n} noble → ${who}`);
  },

  giveCards(
    n = 5,
    opts: { who?: Who; level?: 1 | 2 | 3; color?: GemColor; points?: boolean } = {}
  ) {
    const { who = 'me', level, color, points = false } = opts;
    withState(state => {
      const p = state.players[targetIndex(who)];
      // points: true면 lv3 카드(점수 3~5점)에서 뽑기
      const targetLevel = points ? 3 : level;
      for (let i = 0; i < n; i++) {
        p.cards.push(pickRandomCard(targetLevel, color));
      }
    });
    const labelLevel = points ? 'lv3' : level ? `lv${level}` : '';
    console.info(`[devGame] +${n} card${labelLevel ? ` ${labelLevel}` : ''}${color ? `/${color}` : ''} → ${who}`);
  },

  giveReserved(n = 1, who: Who = 'me') {
    let added = 0;
    withState(state => {
      const p = state.players[targetIndex(who)];
      for (let i = 0; i < n && p.reservedCards.length < 3; i++) {
        p.reservedCards.push(pickRandomCard());
        added++;
      }
    });
    if (added < n) {
      console.warn(`[devGame] +${added}/${n} reserved → ${who} (max 3)`);
    } else {
      console.info(`[devGame] +${added} reserved → ${who}`);
    }
  },

  fill(opts: { cards?: number; nobles?: number; reserved?: number; who?: Who } = {}) {
    const { cards = 10, nobles = 2, reserved = 3, who = 'me' } = opts;
    this.giveCards(cards, { who });
    this.giveNoble(nobles, who);
    this.giveReserved(reserved, who);
  },

  clear(who: Who = 'me') {
    withState(state => {
      const p = state.players[targetIndex(who)];
      p.cards = [];
      p.reservedCards = [];
      p.nobles = [];
    });
    console.info(`[devGame] cleared ${who}`);
  },

  state(): GameState | null {
    return useGameStore.getState().gameState;
  },

  help() {
    console.log(
      `devGame helpers
  giveNoble(n=1, who='me'|'ai')                       귀족 추가
  giveCards(n=5, {who, level, color, points})         카드 추가
  giveReserved(n=1, who='me'|'ai')                    예약 카드 추가 (max 3)
  fill({cards=10, nobles=2, reserved=3, who='me'})    한 번에 채움
  clear(who='me'|'ai')                                 카드/예약/귀족 초기화
  state()                                              현재 gameState 반환

예) __devGame.fill()
    __devGame.giveNoble(2)
    __devGame.giveCards(3, { color: 'red', points: true })
    __devGame.fill({ who: 'ai' })`
    );
  },
};

declare global {
  interface Window {
    __devGame: typeof devGame;
  }
}

export function installDevTools() {
  if (typeof window === 'undefined') return;
  window.__devGame = devGame;
  console.info(
    '%c[devGame] 활성화됨 — __devGame.help() 로 사용법 확인',
    'color:#8f8;font-weight:bold'
  );
}
