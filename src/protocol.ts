import type { GameState, GemMap, TokenMap } from './types/game';

// ─── 턴 단계 (서버/클라이언트 공유) ──────────────────────
export type TurnPhase = 'idle' | 'action' | 'discarding';

// ─── 방 정보 ─────────────────────────────────────────────
export interface RoomPlayer {
  name: string;
  ready: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface RoomInfo {
  code: string;
  players: RoomPlayer[];
  spectators: string[];  // 관전자 이름 목록
  status: 'waiting' | 'playing' | 'ended';
}

// ─── Client → Server 이벤트 ──────────────────────────────
export interface ClientEvents {
  'room:create': (payload: { playerName: string }) => void;
  'room:join': (payload: { roomCode: string; playerName: string }) => void;
  'room:ready': (payload: { ready: boolean }) => void;
  'room:start': () => void;
  'room:leave': () => void;
  'room:switch_to_spectator': () => void;
  'room:switch_to_player': () => void;
  'game:takeTokens': (payload: { tokens: Partial<GemMap> }) => void;
  'game:purchaseCard': (payload: { cardId: string }) => void;
  'game:reserveCard': (payload: { cardId: string }) => void;
  'game:reserveCardFromDeck': (payload: { level: 1 | 2 | 3 }) => void;
  'game:discardTokens': (payload: { tokens: Partial<TokenMap> }) => void;
  'game:confirmTurn': () => void;
  'game:undoAction': () => void;
}

// ─── Server → Client 이벤트 ──────────────────────────────
export interface ServerEvents {
  'room:created': (payload: { roomCode: string; room: RoomInfo; myPlayerIndex: number; sessionId: string }) => void;
  'room:joined': (payload: { room: RoomInfo; myPlayerIndex: number; sessionId: string }) => void;
  'room:reconnected': (payload: {
    roomCode: string;
    room: RoomInfo;
    myPlayerIndex: number;
    sessionId: string;
    gameState: GameState | null;
    turnPhase: TurnPhase;
    logs: string[];
  }) => void;
  'room:updated': (payload: { room: RoomInfo }) => void;
  'room:spectator_joined': (payload: {
    roomCode: string;
    room: RoomInfo;
    gameState: GameState;
    turnPhase: TurnPhase;
    logs: string[];
  }) => void;
  'room:reconnect_failed': () => void;
  'room:error': (payload: { message: string }) => void;
  'game:state': (payload: {
    gameState: GameState;
    turnPhase: TurnPhase;
    myPlayerIndex: number;
    logs: string[];
  }) => void;
  'game:error': (payload: { message: string }) => void;
  'player:disconnected': (payload: { playerName: string; playerIndex: number }) => void;
  'player:reconnected': (payload: { playerName: string; playerIndex: number }) => void;
  'turn:timer': (payload: { remainingSeconds: number; playerName: string; playerIndex: number }) => void;
  'player:abandoned': (payload: { playerName: string; playerIndex: number }) => void;
}
