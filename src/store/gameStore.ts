import { create } from 'zustand';
import type { GameState, GemMap, TokenMap } from '../types/game';
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
  previousState: GameState | null;  // 액션 취소용
  error: string | null;

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

  // 에러 클리어
  clearError: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  turnPhase: 'idle',
  previousState: null,
  error: null,

  startGame: (playerName: string) => {
    const gameState = initGame([playerName, 'AI']);
    set({ gameState, turnPhase: 'idle', previousState: null, error: null });
  },

  doTakeTokens: (tokens: Partial<GemMap>) => {
    const { gameState, turnPhase } = get();
    if (!gameState || gameState.phase !== 'playing' || turnPhase !== 'idle') return;

    try {
      const prev = gameState;
      let next = takeTokens(gameState, tokens);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      set({ gameState: next, turnPhase: phase, previousState: prev, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  doPurchaseCard: (cardId: string) => {
    const { gameState, turnPhase } = get();
    if (!gameState || gameState.phase !== 'playing' || turnPhase !== 'idle') return;

    try {
      const prev = gameState;
      const next = purchaseCard(gameState, cardId);
      set({ gameState: next, turnPhase: 'action', previousState: prev, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  doReserveCard: (cardId: string) => {
    const { gameState, turnPhase } = get();
    if (!gameState || gameState.phase !== 'playing' || turnPhase !== 'idle') return;

    try {
      const prev = gameState;
      const next = reserveCard(gameState, cardId);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      set({ gameState: next, turnPhase: phase, previousState: prev, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  doReserveCardFromDeck: (level: 1 | 2 | 3) => {
    const { gameState, turnPhase } = get();
    if (!gameState || gameState.phase !== 'playing' || turnPhase !== 'idle') return;

    try {
      const prev = gameState;
      const next = reserveCardFromDeck(gameState, level);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      set({ gameState: next, turnPhase: phase, previousState: prev, error: null });
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
    const { previousState } = get();
    if (!previousState) return;
    set({ gameState: previousState, turnPhase: 'idle', previousState: null, error: null });
  },

  confirmTurn: () => {
    const { gameState, turnPhase } = get();
    if (!gameState || gameState.phase !== 'playing') return;
    if (turnPhase !== 'action') return;

    const next = endTurn(gameState);
    set({ gameState: next, turnPhase: 'idle', previousState: null, error: null });

    // AI 턴이면 자동 실행
    if (next.phase === 'playing' && next.players[next.currentPlayerIndex].id !== 'player-0') {
      setTimeout(() => {
        const { gameState: current } = get();
        if (!current || current.phase !== 'playing') return;

        const afterAi = executeAiTurn(current);
        set({ gameState: afterAi, turnPhase: 'idle', previousState: null });
      }, 1000);
    }
  },

  clearError: () => set({ error: null }),
}));
