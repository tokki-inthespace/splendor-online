import { randomUUID } from 'crypto';
import type { Card, GameState, GemMap, TokenMap } from '../src/types/game';
import type { RoomInfo, RoomPlayer, TurnPhase } from '../src/protocol';
import {
  initGame,
  takeTokens,
  purchaseCard,
  reserveCard,
  reserveCardFromDeck,
  discardTokens,
  needsDiscard,
  endTurn,
  getPlayerScore,
} from '../src/game/gameLogic';

export interface SpectatorSession {
  socketId: string;
  name: string;
}

export interface PlayerSession {
  name: string;
  socketId: string;
  sessionId: string;
  playerIndex: number;
  ready: boolean;
  connected: boolean;
}

export class GameRoom {
  code: string;
  status: 'waiting' | 'playing' | 'ended' = 'waiting';
  players: PlayerSession[] = [];
  spectators: SpectatorSession[] = [];
  gameState: GameState | null = null;
  turnPhase: TurnPhase = 'idle';
  previousState: GameState | null = null;
  logs: string[] = [];
  previousLogs: string[] | null = null;

  // 턴 타임아웃 관련
  skipCounts: number[] = [];          // 플레이어별 연속 스킵 횟수
  abandonedPlayers = new Set<number>(); // 퇴장 처리된 플레이어 인덱스
  static readonly MAX_SKIPS = 3;
  static readonly TURN_TIMEOUT_SECONDS = 60;

  // 방 정리용 타임스탬프
  lastActivityAt: number = Date.now();

  constructor(code: string) {
    this.code = code;
  }

  /** 활동 기록 갱신 (액션, 참가, 레디 등) */
  touch(): void {
    this.lastActivityAt = Date.now();
  }

  get hostIndex(): number {
    return 0;
  }

  addPlayer(name: string, socketId: string): PlayerSession {
    const session: PlayerSession = {
      name,
      socketId,
      sessionId: randomUUID(),
      playerIndex: this.players.length,
      ready: false,
      connected: true,
    };
    this.players.push(session);
    return session;
  }

  getPlayerBySessionId(sessionId: string): PlayerSession | undefined {
    return this.players.find(p => p.sessionId === sessionId);
  }

  addSpectator(name: string, socketId: string): SpectatorSession {
    const session: SpectatorSession = { socketId, name };
    this.spectators.push(session);
    return session;
  }

  removeSpectator(socketId: string): SpectatorSession | undefined {
    const idx = this.spectators.findIndex(s => s.socketId === socketId);
    if (idx === -1) return undefined;
    const [removed] = this.spectators.splice(idx, 1);
    return removed;
  }

  getSpectatorBySocketId(socketId: string): SpectatorSession | undefined {
    return this.spectators.find(s => s.socketId === socketId);
  }

  removePlayer(socketId: string): PlayerSession | undefined {
    const idx = this.players.findIndex(p => p.socketId === socketId);
    if (idx === -1) return undefined;
    const [removed] = this.players.splice(idx, 1);
    this.players.forEach((p, i) => { p.playerIndex = i; });
    return removed;
  }

  getPlayerBySocketId(socketId: string): PlayerSession | undefined {
    return this.players.find(p => p.socketId === socketId);
  }

  canStart(): boolean {
    return (
      this.players.length >= 2 &&
      this.players.every(p => p.ready || p.playerIndex === this.hostIndex)
    );
  }

  startGame(): GameState {
    const names = this.players.map(p => p.name);
    this.gameState = initGame(names);
    this.status = 'playing';
    this.turnPhase = 'idle';
    this.logs = [];
    this.previousState = null;
    this.previousLogs = null;
    this.skipCounts = new Array(this.players.length).fill(0);
    this.abandonedPlayers.clear();
    this.touch();
    return this.gameState;
  }

  // ─── 게임 액션 처리 ─────────────────

  private findCard(cardId: string): Card | undefined {
    if (!this.gameState) return undefined;
    for (const level of [1, 2, 3] as const) {
      const found = this.gameState.visibleCards[level].find(c => c?.id === cardId);
      if (found) return found;
    }
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    return currentPlayer.reservedCards.find(c => c.id === cardId);
  }

  private savePreviousState(): void {
    this.previousState = this.gameState;
    this.previousLogs = [...this.logs];
  }

  handleTakeTokens(playerIndex: number, tokens: Partial<GemMap>): string | null {
    if (!this.gameState || this.gameState.phase !== 'playing') return '게임이 진행 중이 아닙니다';
    if (this.gameState.currentPlayerIndex !== playerIndex) return '당신의 턴이 아닙니다';
    if (this.turnPhase !== 'idle') return '이미 액션을 수행했습니다';

    try {
      this.savePreviousState();
      const next = takeTokens(this.gameState, tokens);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      const name = this.gameState.players[playerIndex].name;

      const desc = Object.entries(tokens)
        .filter(([, n]) => (n ?? 0) > 0)
        .map(([color, n]) => n! > 1 ? `${color} x${n}` : color)
        .join(', ');

      this.gameState = next;
      this.turnPhase = phase;
      this.logs = [...this.logs, `${name}이(가) ${desc} 토큰을 가져왔습니다`];
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  handlePurchaseCard(playerIndex: number, cardId: string): string | null {
    if (!this.gameState || this.gameState.phase !== 'playing') return '게임이 진행 중이 아닙니다';
    if (this.gameState.currentPlayerIndex !== playerIndex) return '당신의 턴이 아닙니다';
    if (this.turnPhase !== 'idle') return '이미 액션을 수행했습니다';

    try {
      this.savePreviousState();
      const card = this.findCard(cardId);
      const next = purchaseCard(this.gameState, cardId);
      const name = this.gameState.players[playerIndex].name;
      const desc = card
        ? `${card.color} 카드를 구매했습니다${card.points > 0 ? ` (${card.points}점)` : ''}`
        : '카드를 구매했습니다';

      this.gameState = next;
      this.turnPhase = 'action';
      this.logs = [...this.logs, `${name}이(가) ${desc}`];
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  handleReserveCard(playerIndex: number, cardId: string): string | null {
    if (!this.gameState || this.gameState.phase !== 'playing') return '게임이 진행 중이 아닙니다';
    if (this.gameState.currentPlayerIndex !== playerIndex) return '당신의 턴이 아닙니다';
    if (this.turnPhase !== 'idle') return '이미 액션을 수행했습니다';

    try {
      this.savePreviousState();
      const card = this.findCard(cardId);
      const next = reserveCard(this.gameState, cardId);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      const name = this.gameState.players[playerIndex].name;
      const desc = card ? `${card.color} 카드를 예약했습니다` : '카드를 예약했습니다';

      this.gameState = next;
      this.turnPhase = phase;
      this.logs = [...this.logs, `${name}이(가) ${desc}`];
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  handleReserveCardFromDeck(playerIndex: number, level: 1 | 2 | 3): string | null {
    if (!this.gameState || this.gameState.phase !== 'playing') return '게임이 진행 중이 아닙니다';
    if (this.gameState.currentPlayerIndex !== playerIndex) return '당신의 턴이 아닙니다';
    if (this.turnPhase !== 'idle') return '이미 액션을 수행했습니다';

    try {
      this.savePreviousState();
      const next = reserveCardFromDeck(this.gameState, level);
      const phase = needsDiscard(next) ? 'discarding' : 'action';
      const name = this.gameState.players[playerIndex].name;

      this.gameState = next;
      this.turnPhase = phase;
      this.logs = [...this.logs, `${name}이(가) 레벨${level} 덱에서 카드를 예약했습니다`];
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  handleDiscardTokens(playerIndex: number, tokens: Partial<TokenMap>): string | null {
    if (!this.gameState || this.turnPhase !== 'discarding') return '토큰 버리기 상태가 아닙니다';
    if (this.gameState.currentPlayerIndex !== playerIndex) return '당신의 턴이 아닙니다';

    try {
      const next = discardTokens(this.gameState, tokens);
      this.gameState = next;
      this.turnPhase = 'action';
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  handleUndoAction(playerIndex: number): string | null {
    if (!this.gameState) return '게임이 진행 중이 아닙니다';
    if (this.gameState.currentPlayerIndex !== playerIndex) return '당신의 턴이 아닙니다';
    if (!this.previousState) return '되돌릴 수 없습니다';

    this.gameState = this.previousState;
    this.turnPhase = 'idle';
    this.previousState = null;
    this.logs = this.previousLogs ?? [];
    this.previousLogs = null;
    return null;
  }

  handleConfirmTurn(playerIndex: number): string | null {
    if (!this.gameState || this.gameState.phase !== 'playing') return '게임이 진행 중이 아닙니다';
    if (this.gameState.currentPlayerIndex !== playerIndex) return '당신의 턴이 아닙니다';
    if (this.turnPhase !== 'action') return '먼저 액션을 수행해야 합니다';

    const currentIdx = this.gameState.currentPlayerIndex;
    this.resetSkipCount(currentIdx);
    const next = endTurn(this.gameState);

    // 귀족 획득 감지
    const noblesBefore = this.gameState.players[currentIdx].nobles.length;
    const noblesAfter = next.players[currentIdx].nobles.length;
    if (noblesAfter > noblesBefore) {
      const earned = next.players[currentIdx].nobles.slice(noblesBefore);
      for (const n of earned) {
        this.logs = [...this.logs, `${this.gameState.players[currentIdx].name}이(가) 귀족을 획득했습니다 (+${n.points}점)`];
      }
    }

    if (next.phase === 'ended' && next.winner) {
      this.logs = [...this.logs, `게임 종료! ${next.winner.name} 승리 (${getPlayerScore(next.winner)}점)`];
      this.status = 'ended';
    }

    this.gameState = next;
    this.turnPhase = 'idle';
    this.previousState = null;
    this.previousLogs = null;
    return null;
  }

  // ─── 턴 스킵 / 퇴장 ─────────────────

  /** 현재 플레이어가 끊김/퇴장 상태여서 자동 스킵이 필요한지 */
  needsAutoSkip(): boolean {
    if (!this.gameState || this.gameState.phase !== 'playing') return false;
    const idx = this.gameState.currentPlayerIndex;
    return this.abandonedPlayers.has(idx) || !this.players[idx]?.connected;
  }

  /** 퇴장 플레이어는 즉시 스킵, 끊김 플레이어는 타이머 필요 */
  shouldSkipImmediately(): boolean {
    if (!this.gameState) return false;
    return this.abandonedPlayers.has(this.gameState.currentPlayerIndex);
  }

  /** 턴 스킵 처리 (끊긴 플레이어 턴 타임아웃 또는 퇴장 플레이어) */
  skipCurrentTurn(): void {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    const idx = this.gameState.currentPlayerIndex;
    const name = this.gameState.players[idx].name;

    // 액션 중이었다면 되돌리기
    if (this.previousState) {
      this.gameState = this.previousState;
      this.logs = this.previousLogs ?? this.logs;
    }

    // endTurn으로 다음 플레이어에게 넘기기
    const next = endTurn(this.gameState);

    if (!this.abandonedPlayers.has(idx)) {
      this.skipCounts[idx] = (this.skipCounts[idx] ?? 0) + 1;
      this.logs = [...this.logs, `${name}의 턴이 스킵되었습니다 (${this.skipCounts[idx]}/${GameRoom.MAX_SKIPS})`];

      if (this.skipCounts[idx] >= GameRoom.MAX_SKIPS) {
        this.abandonedPlayers.add(idx);
        this.logs = [...this.logs, `${name}이(가) 게임에서 퇴장되었습니다`];
      }
    }

    // 게임 종료 체크 (활성 플레이어가 1명 이하면 종료)
    const activePlayers = this.gameState.players.filter((_, i) => !this.abandonedPlayers.has(i));
    if (activePlayers.length <= 1 && next.phase !== 'ended') {
      const winner = activePlayers[0] ?? this.gameState.players[0];
      this.gameState = { ...next, phase: 'ended', winner };
      this.status = 'ended';
      this.logs = [...this.logs, `게임 종료! ${winner.name} 승리 (${getPlayerScore(winner)}점)`];
    } else if (next.phase === 'ended' && next.winner) {
      this.gameState = next;
      this.status = 'ended';
      this.logs = [...this.logs, `게임 종료! ${next.winner.name} 승리 (${getPlayerScore(next.winner)}점)`];
    } else {
      this.gameState = next;
    }

    this.turnPhase = 'idle';
    this.previousState = null;
    this.previousLogs = null;
  }

  /** 플레이어가 정상 액션을 수행하면 skipCount 리셋 */
  resetSkipCount(playerIndex: number): void {
    this.skipCounts[playerIndex] = 0;
  }

  isAbandoned(playerIndex: number): boolean {
    return this.abandonedPlayers.has(playerIndex);
  }

  /** 2인 게임에서 상대가 나갔을 때: 즉시 게임 종료, 남은 플레이어 승리 */
  forceWinByDisconnect(disconnectedPlayerIndex: number): void {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    const disconnectedName = this.gameState.players[disconnectedPlayerIndex].name;
    const winnerIndex = disconnectedPlayerIndex === 0 ? 1 : 0;
    const winner = this.gameState.players[winnerIndex];

    // 액션 중이었다면 되돌리기
    if (this.previousState) {
      this.gameState = this.previousState;
      this.logs = this.previousLogs ?? this.logs;
    }

    this.gameState = { ...this.gameState, phase: 'ended', winner };
    this.status = 'ended';
    this.turnPhase = 'idle';
    this.previousState = null;
    this.previousLogs = null;
    this.logs = [...this.logs, `${disconnectedName}이(가) 게임을 떠났습니다 — ${winner.name} 승리!`];
  }

  /** 총 플레이어 수 */
  get playerCount(): number {
    return this.players.length;
  }

  // ─── 유틸리티 ──────────────────────

  toRoomInfo(): RoomInfo {
    return {
      code: this.code,
      status: this.status,
      players: this.players.map((p): RoomPlayer => ({
        name: p.name,
        ready: p.ready,
        isHost: p.playerIndex === this.hostIndex,
        connected: p.connected,
      })),
      spectatorCount: this.spectators.length,
    };
  }

  isEmpty(): boolean {
    return this.players.length === 0;
  }
}
