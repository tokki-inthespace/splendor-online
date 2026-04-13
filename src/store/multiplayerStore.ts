import { create } from 'zustand';
import type { GameState, GemMap, TokenMap } from '../types/game';
import type { EmoteId, RoomInfo, TurnPhase } from '../protocol';
import { EMOTE_COOLDOWN_MS } from '../protocol';
import { getSocket, disconnectSocket } from '../hooks/useSocket';

const SESSION_KEY = 'splendor-session-id';

function saveSessionId(sessionId: string): void {
  sessionStorage.setItem(SESSION_KEY, sessionId);
}

function loadSessionId(): string | undefined {
  return sessionStorage.getItem(SESSION_KEY) ?? undefined;
}

function clearSessionId(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

interface MultiplayerStore {
  // 연결 상태
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

  // 로비 상태
  roomCode: string | null;
  roomInfo: RoomInfo | null;
  myPlayerIndex: number | null;
  lobbyError: string | null;

  // 게임 상태 (서버에서 수신)
  gameState: GameState | null;
  turnPhase: TurnPhase;
  logs: string[];
  error: string | null;

  // 관전 모드
  isSpectator: boolean;

  // 턴 타이머
  turnTimer: { remainingSeconds: number; playerName: string; playerIndex: number } | null;

  // 이모트 — 플레이어별 현재 표시 중인 이모트
  activeEmotes: Record<number, { emoteId: EmoteId; timestamp: number }>;
  // 내 이모트 쿨다운 종료 시각 (ms epoch)
  myEmoteCooldownUntil: number;

  // 연결
  connect: () => void;
  disconnect: () => void;

  // 로비 액션
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  leaveRoom: () => void;
  switchToSpectator: () => void;
  switchToPlayer: () => void;
  clearLobbyError: () => void;

  // 게임 액션 (서버에 전송)
  doTakeTokens: (tokens: Partial<GemMap>) => void;
  doPurchaseCard: (cardId: string) => void;
  doReserveCard: (cardId: string) => void;
  doReserveCardFromDeck: (level: 1 | 2 | 3) => void;
  doDiscardTokens: (tokens: Partial<TokenMap>) => void;
  undoAction: () => void;
  confirmTurn: () => void;
  clearError: () => void;
  sendEmote: (emoteId: EmoteId) => void;

  // 게임 리셋 (방 나가기)
  resetGame: () => void;
}

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  connectionStatus: 'disconnected',
  roomCode: null,
  roomInfo: null,
  myPlayerIndex: null,
  lobbyError: null,
  gameState: null,
  turnPhase: 'idle',
  logs: [],
  error: null,
  isSpectator: false,
  turnTimer: null,
  activeEmotes: {},
  myEmoteCooldownUntil: 0,

  connect: () => {
    const savedSessionId = loadSessionId();
    const auth = savedSessionId ? { sessionId: savedSessionId } : undefined;
    const socket = getSocket(auth);

    if (socket.connected) {
      set({ connectionStatus: 'connected' });
      return;
    }

    // 기존 리스너 제거 (중복 방지)
    socket.removeAllListeners();

    set({ connectionStatus: savedSessionId ? 'reconnecting' : 'connecting' });

    socket.on('connect', () => {
      set({ connectionStatus: 'connected' });
    });

    socket.on('disconnect', () => {
      const { roomCode, isSpectator } = get();
      // 관전자는 재접속 불가 → 즉시 초기화
      if (isSpectator) {
        set({
          connectionStatus: 'disconnected',
          roomCode: null,
          roomInfo: null,
          myPlayerIndex: null,
          gameState: null,
          turnPhase: 'idle',
          logs: [],
          error: null,
          isSpectator: false,
          turnTimer: null,
          activeEmotes: {},
          myEmoteCooldownUntil: 0,
        });
        return;
      }
      // 게임/로비에 있었다면 reconnecting 상태로 (Socket.IO가 자동 재접속 시도)
      if (roomCode) {
        set({ connectionStatus: 'reconnecting' });
      } else {
        set({ connectionStatus: 'disconnected' });
      }
    });

    socket.on('room:created', ({ roomCode, room, myPlayerIndex, sessionId }) => {
      saveSessionId(sessionId);
      set({ roomCode, roomInfo: room, myPlayerIndex, lobbyError: null });
    });

    socket.on('room:joined', ({ room, myPlayerIndex, sessionId }) => {
      saveSessionId(sessionId);
      set({ roomCode: room.code, roomInfo: room, myPlayerIndex, lobbyError: null });
    });

    socket.on('room:reconnected', ({ roomCode, room, myPlayerIndex, sessionId, gameState, turnPhase, logs }) => {
      saveSessionId(sessionId);
      set({
        connectionStatus: 'connected',
        roomCode,
        roomInfo: room,
        myPlayerIndex,
        gameState,
        turnPhase,
        logs: [...logs, '재접속에 성공했습니다'],
        lobbyError: null,
        error: null,
        turnTimer: null,
      });
    });

    socket.on('room:spectator_joined', ({ roomCode, room, gameState, turnPhase, logs }) => {
      set({
        connectionStatus: 'connected',
        roomCode,
        roomInfo: room,
        myPlayerIndex: -1,
        gameState,
        turnPhase,
        logs,
        isSpectator: true,
        lobbyError: null,
        error: null,
        turnTimer: null,
      });
    });

    socket.on('room:reconnect_failed', () => {
      clearSessionId();
      set({
        connectionStatus: 'disconnected',
        roomCode: null,
        roomInfo: null,
        myPlayerIndex: null,
        gameState: null,
        turnPhase: 'idle',
        logs: [],
        error: null,
        isSpectator: false,
        turnTimer: null,
        activeEmotes: {},
        myEmoteCooldownUntil: 0,
      });
    });

    socket.on('room:updated', ({ room }) => {
      set({ roomInfo: room });
    });

    socket.on('room:error', ({ message }) => {
      set({ lobbyError: message });
    });

    socket.on('game:state', ({ gameState, turnPhase, myPlayerIndex, logs, spectators }) => {
      set({ gameState, turnPhase, myPlayerIndex, logs, error: null, turnTimer: null });
      // roomInfo의 spectators도 최신으로 갱신
      const { roomInfo } = get();
      if (roomInfo) {
        set({ roomInfo: { ...roomInfo, spectators } });
      }
    });

    socket.on('game:error', ({ message }) => {
      set({ error: message });
    });

    socket.on('turn:timer', (payload) => {
      set({ turnTimer: payload });
    });

    socket.on('player:disconnected', ({ playerName }) => {
      const { logs } = get();
      set({ logs: [...logs, `${playerName}의 연결이 끊어졌습니다`] });
    });

    socket.on('player:reconnected', ({ playerName }) => {
      const { logs } = get();
      set({ logs: [...logs, `${playerName}이(가) 다시 접속했습니다`], turnTimer: null });
    });

    socket.on('player:abandoned', ({ playerName }) => {
      const { logs } = get();
      set({ logs: [...logs, `${playerName}이(가) 게임에서 퇴장되었습니다`] });
    });

    socket.on('player:emote', ({ playerIndex, emoteId }) => {
      const ts = Date.now();
      set({
        activeEmotes: {
          ...get().activeEmotes,
          [playerIndex]: { emoteId, timestamp: ts },
        },
      });
      // 3초 후 자동 제거 (같은 플레이어가 새 이모트로 덮어썼으면 스킵)
      setTimeout(() => {
        const current = get().activeEmotes[playerIndex];
        if (current && current.timestamp === ts) {
          const next = { ...get().activeEmotes };
          delete next[playerIndex];
          set({ activeEmotes: next });
        }
      }, EMOTE_COOLDOWN_MS);
    });

    // 재접속 최대 시도 초과 시 정리
    socket.io.on('reconnect_failed', () => {
      clearSessionId();
      set({
        connectionStatus: 'disconnected',
        roomCode: null,
        roomInfo: null,
        myPlayerIndex: null,
        gameState: null,
        turnPhase: 'idle',
        logs: [],
        error: null,
        isSpectator: false,
        turnTimer: null,
        activeEmotes: {},
        myEmoteCooldownUntil: 0,
      });
    });

    socket.connect();
  },

  disconnect: () => {
    disconnectSocket();
    clearSessionId();
    set({
      connectionStatus: 'disconnected',
      roomCode: null,
      roomInfo: null,
      myPlayerIndex: null,
      lobbyError: null,
      gameState: null,
      turnPhase: 'idle',
      logs: [],
      error: null,
      isSpectator: false,
      turnTimer: null,
      activeEmotes: {},
      myEmoteCooldownUntil: 0,
    });
  },

  createRoom: (playerName) => {
    getSocket().emit('room:create', { playerName });
  },

  joinRoom: (roomCode, playerName) => {
    set({ lobbyError: null });
    getSocket().emit('room:join', { roomCode, playerName });
  },

  setReady: (ready) => {
    getSocket().emit('room:ready', { ready });
  },

  startGame: () => {
    getSocket().emit('room:start');
  },

  switchToSpectator: () => {
    getSocket().emit('room:switch_to_spectator');
    set({ isSpectator: true, myPlayerIndex: -1 });
  },

  switchToPlayer: () => {
    getSocket().emit('room:switch_to_player');
    set({ isSpectator: false });
  },

  leaveRoom: () => {
    getSocket().emit('room:leave');
    disconnectSocket();
    clearSessionId();
    set({
      connectionStatus: 'disconnected',
      roomCode: null,
      roomInfo: null,
      myPlayerIndex: null,
      lobbyError: null,
      gameState: null,
      turnPhase: 'idle',
      logs: [],
      error: null,
      isSpectator: false,
      turnTimer: null,
      activeEmotes: {},
      myEmoteCooldownUntil: 0,
    });
  },

  clearLobbyError: () => set({ lobbyError: null }),

  // 게임 액션 — 서버에 전송만 함
  doTakeTokens: (tokens) => {
    getSocket().emit('game:takeTokens', { tokens });
  },

  doPurchaseCard: (cardId) => {
    getSocket().emit('game:purchaseCard', { cardId });
  },

  doReserveCard: (cardId) => {
    getSocket().emit('game:reserveCard', { cardId });
  },

  doReserveCardFromDeck: (level) => {
    getSocket().emit('game:reserveCardFromDeck', { level });
  },

  doDiscardTokens: (tokens) => {
    getSocket().emit('game:discardTokens', { tokens });
  },

  undoAction: () => {
    getSocket().emit('game:undoAction');
  },

  confirmTurn: () => {
    getSocket().emit('game:confirmTurn');
  },

  sendEmote: (emoteId) => {
    const now = Date.now();
    if (now < get().myEmoteCooldownUntil) return;
    set({ myEmoteCooldownUntil: now + EMOTE_COOLDOWN_MS });
    getSocket().emit('player:emote', { emoteId });
  },

  clearError: () => set({ error: null }),

  resetGame: () => {
    get().leaveRoom();
  },
}));
