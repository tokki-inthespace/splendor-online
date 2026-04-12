import { create } from 'zustand';
import type { Card, GameState, GemMap, TokenMap } from '../types/game';
import {
  initGame,
  takeTokens,
  purchaseCard,
  reserveCard,
  reserveCardFromDeck,
  discardTokens,
  needsDiscard,
  endTurn,
} from '../game/gameLogic';
import { executeAiTurn } from '../game/aiLogic';

// 턴 내 진행 단계
type TurnPhase = 'idle' | 'action' | 'discarding';

interface GameStore {
  // 상태
  gameState: GameState | null;
  turnPhase: TurnPhase;
  previousState: GameState | null;
  error: string | null;
  logs: string[];
  previousLogs: string[] | null;

  // 게임 시작
  startGame: (playerName: string) => void;

  // 플레이어 액션
  doTakeTokens: (tokens: Partial<GemMap>) => void;
  doPurchaseCard: (cardId: string) => void;
  doReserveCard: (cardId: string) => void;
  doReserveCardFromDeck: (level: 1 | 2 | 3) => void;

  // 토큰 버리기 (10개 초과 시)
  doDiscardTokens: (tokens: Partial<TokenMap>) => void;

  // 액션 취소 (턴 확정 전)
  undoAction: () => void;

  // 턴 확정
  confirmTurn: () => void;

  // 게임 리셋 (시작 화면으로)
  resetGame: () => void;

  // 에러 클리어
  clearError: () => void;
}

import { describeTokens } from '../utils/gemColors';

// ─── 로그 헬퍼 ────────────────────────

function findCard(state: GameState, cardId: string): Card | undefined {
  for (const level of [1, 2, 3] as const) {
    const found = state.visibleCards[level].find(c => c?.id === cardId);
    if (found) return found;
  }
  return state.players[state.currentPlayerIndex].reservedCards.find(c => c.id === cardId);
}

// ─── 스토어 ───────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  turnPhase: 'idle',
  previousState: null,
  error: null,
  logs: [],
  previousLogs: null,

  startGame: (playerName: string) => {
    const gameState = initGame([playerName, 'AI']);
    set({ gameState, turnPhase: 'idle', previousState: null, error: null, logs: [], previousLogs: null });
  },

  doTakeTokens: (tokens: Partial<GemMap>) => {
    const { gameState, turnPhase, logs } = get();
    if (!gameState || gameState.phase !== 'playing' || turnPhase !== 'idle') return;

    try {
      const prev = gameState;
      const next = takeTokens(gameState, tokens);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      const name = gameState.players[gameState.currentPlayerIndex].name;
      set({
        gameState: next, turnPhase: phase, previousState: prev, error: null,
        previousLogs: logs,
        logs: [...logs, `${name}이(가) ${describeTokens(tokens)} 토큰을 가져왔습니다`],
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  doPurchaseCard: (cardId: string) => {
    const { gameState, turnPhase, logs } = get();
    if (!gameState || gameState.phase !== 'playing' || turnPhase !== 'idle') return;

    try {
      const prev = gameState;
      const card = findCard(gameState, cardId);
      const next = purchaseCard(gameState, cardId);
      const name = gameState.players[gameState.currentPlayerIndex].name;
      const desc = card ? `${card.color} 카드를 구매했습니다${card.points > 0 ? ` (${card.points}점)` : ''}` : '카드를 구매했습니다';
      set({
        gameState: next, turnPhase: 'action', previousState: prev, error: null,
        previousLogs: logs,
        logs: [...logs, `${name}이(가) ${desc}`],
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  doReserveCard: (cardId: string) => {
    const { gameState, turnPhase, logs } = get();
    if (!gameState || gameState.phase !== 'playing' || turnPhase !== 'idle') return;

    try {
      const prev = gameState;
      const card = findCard(gameState, cardId);
      const next = reserveCard(gameState, cardId);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      const name = gameState.players[gameState.currentPlayerIndex].name;
      const desc = card ? `${card.color} 카드를 예약했습니다` : '카드를 예약했습니다';
      set({
        gameState: next, turnPhase: phase, previousState: prev, error: null,
        previousLogs: logs,
        logs: [...logs, `${name}이(가) ${desc}`],
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  doReserveCardFromDeck: (level: 1 | 2 | 3) => {
    const { gameState, turnPhase, logs } = get();
    if (!gameState || gameState.phase !== 'playing' || turnPhase !== 'idle') return;

    try {
      const prev = gameState;
      const next = reserveCardFromDeck(gameState, level);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      const name = gameState.players[gameState.currentPlayerIndex].name;
      set({
        gameState: next, turnPhase: phase, previousState: prev, error: null,
        previousLogs: logs,
        logs: [...logs, `${name}이(가) 레벨${level} 덱에서 카드를 예약했습니다`],
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  doDiscardTokens: (tokens: Partial<TokenMap>) => {
    const { gameState, turnPhase } = get();
    if (!gameState || turnPhase !== 'discarding') return;

    try {
      const next = discardTokens(gameState, tokens);
      set({ gameState: next, turnPhase: 'action', error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  undoAction: () => {
    const { previousState, previousLogs } = get();
    if (!previousState) return;
    set({
      gameState: previousState, turnPhase: 'idle', previousState: null, error: null,
      logs: previousLogs ?? [], previousLogs: null,
    });
  },

  confirmTurn: () => {
    const { gameState, turnPhase, logs } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    if (turnPhase !== 'action') return;

    const playerIndex = gameState.currentPlayerIndex;
    const next = endTurn(gameState);
    const newLogs = [...logs];

    // 귀족 획득 감지
    const noblesBefore = gameState.players[playerIndex].nobles.length;
    const noblesAfter = next.players[playerIndex].nobles.length;
    if (noblesAfter > noblesBefore) {
      const earned = next.players[playerIndex].nobles.slice(noblesBefore);
      for (const n of earned) {
        newLogs.push(`${gameState.players[playerIndex].name}이(가) 귀족을 획득했습니다 (+${n.points}점)`);
      }
    }

    if (next.phase === 'ended' && next.winner) {
      newLogs.push(`게임 종료! ${next.winner.name} 승리`);
    }

    set({ gameState: next, turnPhase: 'idle', previousState: null, previousLogs: null, error: null, logs: newLogs });

    // AI 턴이면 자동 실행
    if (next.phase === 'playing' && next.players[next.currentPlayerIndex].id !== 'player-0') {
      setTimeout(() => {
        const { gameState: current, logs: currentLogs } = get();
        if (!current || current.phase !== 'playing') return;

        const result = executeAiTurn(current);
        set({
          gameState: result.state, turnPhase: 'idle', previousState: null,
          logs: [...currentLogs, ...result.logs],
        });
      }, 1000);
    }
  },

  resetGame: () => set({ gameState: null, turnPhase: 'idle', previousState: null, error: null, logs: [], previousLogs: null }),

  clearError: () => set({ error: null }),
}));
