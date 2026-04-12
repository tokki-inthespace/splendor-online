import { create } from 'zustand';
import type { GameState, GemMap, TokenMap } from '../types/game';
import type { RoomInfo, TurnPhase } from '../protocol';
import { getSocket, disconnectSocket } from '../hooks/useSocket';

interface MultiplayerStore {
  // 연결 상태
  connectionStatus: 'disconnected' | 'connecting' | 'connected';

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

  // 턴 타이머
  turnTimer: { remainingSeconds: number; playerName: string; playerIndex: number } | null;

  // 연결
  connect: () => void;
  disconnect: () => void;

  // 로비 액션
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  leaveRoom: () => void;
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
  turnTimer: null,

  connect: () => {
    const socket = getSocket();
    if (socket.connected) {
      set({ connectionStatus: 'connected' });
      return;
    }

    // 기존 리스너 제거 (중복 방지)
    socket.removeAllListeners();

    set({ connectionStatus: 'connecting' });

    socket.on('connect', () => {
      set({ connectionStatus: 'connected' });
    });

    socket.on('disconnect', () => {
      set({ connectionStatus: 'disconnected' });
    });

    socket.on('room:created', ({ roomCode, room, myPlayerIndex }) => {
      set({ roomCode, roomInfo: room, myPlayerIndex, lobbyError: null });
    });

    socket.on('room:joined', ({ room, myPlayerIndex }) => {
      set({ roomCode: room.code, roomInfo: room, myPlayerIndex, lobbyError: null });
    });

    socket.on('room:updated', ({ room }) => {
      set({ roomInfo: room });
    });

    socket.on('room:error', ({ message }) => {
      set({ lobbyError: message });
    });

    socket.on('game:state', ({ gameState, turnPhase, myPlayerIndex, logs }) => {
      set({ gameState, turnPhase, myPlayerIndex, logs, error: null, turnTimer: null });
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
      set({ logs: [...logs, `${playerName}이(가) 다시 접속했습니다`] });
    });

    socket.on('player:abandoned', ({ playerName }) => {
      const { logs } = get();
      set({ logs: [...logs, `${playerName}이(가) 게임에서 퇴장되었습니다`] });
    });

    socket.connect();
  },

  disconnect: () => {
    disconnectSocket();
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
      turnTimer: null,
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

  leaveRoom: () => {
    getSocket().emit('room:leave');
    disconnectSocket();
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
      turnTimer: null,
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

  clearError: () => set({ error: null }),

  resetGame: () => {
    get().leaveRoom();
  },
}));
