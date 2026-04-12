import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '../src/protocol.js';
import { GameRoom } from './GameRoom.js';

type IOServer = Server<ClientEvents, ServerEvents>;
type IOSocket = Socket<ClientEvents, ServerEvents>;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동 문자 제외 (I/1, O/0)
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface TurnTimer {
  timeout: ReturnType<typeof setTimeout>;
  interval: ReturnType<typeof setInterval>;
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private io: IOServer;
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private turnTimers = new Map<string, TurnTimer>(); // roomCode -> timer

  // 방 만료 시간 (ms)
  private static readonly ENDED_ROOM_TTL = 5 * 60 * 1000;     // 종료된 방: 5분
  private static readonly WAITING_ROOM_TTL = 30 * 60 * 1000;   // 대기 중 방: 30분
  private static readonly PLAYING_ROOM_TTL = 15 * 60 * 1000;   // 진행 중 방: 15분
  private static readonly GC_INTERVAL = 60 * 1000;             // GC 주기: 1분

  constructor(io: IOServer) {
    this.io = io;
    this.startGarbageCollection();
  }

  private startGarbageCollection(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [code, room] of this.rooms) {
        const elapsed = now - room.lastActivityAt;
        let ttl: number;

        if (room.status === 'ended') ttl = RoomManager.ENDED_ROOM_TTL;
        else if (room.status === 'waiting') ttl = RoomManager.WAITING_ROOM_TTL;
        else ttl = RoomManager.PLAYING_ROOM_TTL;

        if (elapsed > ttl) {
          // 턴 타이머 정리
          this.clearTurnTimer(code);

          // 방에 남은 플레이어들의 disconnect 타이머 + 소켓 정리
          for (const p of room.players) {
            const dt = this.disconnectTimers.get(p.socketId);
            if (dt) {
              clearTimeout(dt);
              this.disconnectTimers.delete(p.socketId);
            }
            const s = this.io.sockets.sockets.get(p.socketId);
            if (s) {
              s.leave(this.socketRoom(code));
              s.data = {};
            }
          }

          // 관전자 소켓 정리
          for (const s of room.spectators) {
            const sock = this.io.sockets.sockets.get(s.socketId);
            if (sock) {
              sock.leave(this.socketRoom(code));
              sock.data = {};
            }
          }

          this.rooms.delete(code);
          console.log(`[GC] 방 삭제: ${code} (${room.status}, ${Math.round(elapsed / 1000)}초 비활성)`);
        }
      }
    }, RoomManager.GC_INTERVAL);
  }

  private createUniqueCode(): string {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));
    return code;
  }

  private socketRoom(code: string): string {
    return `room:${code}`;
  }

  registerSocket(socket: IOSocket): void {
    // 재접속 시도: auth에 sessionId가 있으면 기존 세션 복구
    const authSessionId = socket.handshake.auth?.sessionId as string | undefined;
    if (authSessionId) {
      const reconnected = this.tryReconnect(socket, authSessionId);
      if (reconnected) {
        this.registerGameEvents(socket);
        return;
      }
      // 세션을 찾을 수 없음 (방 GC 등) → 클라이언트에 알림
      socket.emit('room:reconnect_failed');
    }

    // 로비 이벤트
    socket.on('room:create', ({ playerName }) => this.handleCreate(socket, playerName));
    socket.on('room:join', ({ roomCode, playerName }) => this.handleJoin(socket, roomCode, playerName));
    socket.on('room:ready', ({ ready }) => this.handleReady(socket, ready));
    socket.on('room:start', () => this.handleStart(socket));
    socket.on('room:leave', () => this.handleLeave(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));

    // 게임 액션 이벤트
    this.registerGameEvents(socket);
  }

  private registerGameEvents(socket: IOSocket): void {
    socket.on('game:takeTokens', ({ tokens }) => this.handleGameAction(socket, room => room.handleTakeTokens(socket.data.playerIndex, tokens)));
    socket.on('game:purchaseCard', ({ cardId }) => this.handleGameAction(socket, room => room.handlePurchaseCard(socket.data.playerIndex, cardId)));
    socket.on('game:reserveCard', ({ cardId }) => this.handleGameAction(socket, room => room.handleReserveCard(socket.data.playerIndex, cardId)));
    socket.on('game:reserveCardFromDeck', ({ level }) => this.handleGameAction(socket, room => room.handleReserveCardFromDeck(socket.data.playerIndex, level)));
    socket.on('game:discardTokens', ({ tokens }) => this.handleGameAction(socket, room => room.handleDiscardTokens(socket.data.playerIndex, tokens)));
    socket.on('game:undoAction', () => this.handleGameAction(socket, room => room.handleUndoAction(socket.data.playerIndex)));
    socket.on('game:confirmTurn', () => this.handleGameAction(socket, room => room.handleConfirmTurn(socket.data.playerIndex)));
  }

  /** sessionId로 기존 세션 복구 시도. 성공하면 true 반환. */
  private tryReconnect(socket: IOSocket, sessionId: string): boolean {
    for (const [code, room] of this.rooms) {
      const player = room.getPlayerBySessionId(sessionId);
      if (!player) continue;

      // 이미 연결된 상태면 재접속 불필요
      if (player.connected) return false;

      const oldSocketId = player.socketId;

      // 기존 disconnect 타이머 취소
      const dt = this.disconnectTimers.get(oldSocketId);
      if (dt) {
        clearTimeout(dt);
        this.disconnectTimers.delete(oldSocketId);
      }

      // 소켓 정보 업데이트
      player.socketId = socket.id;
      player.connected = true;
      socket.data = { roomCode: code, playerIndex: player.playerIndex };
      socket.join(this.socketRoom(code));

      room.touch();

      // 재접속 이벤트 등록 (로비 이벤트 + disconnect)
      socket.on('room:ready', ({ ready }) => this.handleReady(socket, ready));
      socket.on('room:start', () => this.handleStart(socket));
      socket.on('room:leave', () => this.handleLeave(socket));
      socket.on('disconnect', () => this.handleDisconnect(socket));

      // 재접속 플레이어에게 전체 상태 전송
      socket.emit('room:reconnected', {
        roomCode: code,
        room: room.toRoomInfo(),
        myPlayerIndex: player.playerIndex,
        sessionId: player.sessionId,
        gameState: room.gameState,
        turnPhase: room.turnPhase,
        logs: room.logs,
      });

      // 다른 플레이어들에게 재접속 알림
      socket.to(this.socketRoom(code)).emit('player:reconnected', {
        playerName: player.name,
        playerIndex: player.playerIndex,
      });

      // 재접속한 플레이어가 현재 턴이고 턴 타이머가 돌고 있었다면 정리
      if (room.gameState && room.status === 'playing') {
        const isCurrentTurn = room.gameState.currentPlayerIndex === player.playerIndex;
        if (isCurrentTurn && this.turnTimers.has(code)) {
          // 재접속했으므로 턴 타이머 중단, 정상 플레이 가능
          this.clearTurnTimer(code);
        }
      }

      console.log(`[재접속] ${code} — ${player.name} (idx=${player.playerIndex})`);
      return true;
    }
    return false;
  }

  private handleCreate(socket: IOSocket, playerName: string): void {
    // 이미 방에 있으면 먼저 나가기
    this.leaveCurrentRoom(socket);

    const code = this.createUniqueCode();
    const room = new GameRoom(code);
    this.rooms.set(code, room);

    const session = room.addPlayer(playerName, socket.id);
    socket.data = { roomCode: code, playerIndex: session.playerIndex };
    socket.join(this.socketRoom(code));

    room.touch();
    socket.emit('room:created', { roomCode: code, room: room.toRoomInfo(), myPlayerIndex: session.playerIndex, sessionId: session.sessionId });
    console.log(`[방 생성] ${code} by ${playerName}`);
  }

  private handleJoin(socket: IOSocket, roomCode: string, playerName: string): void {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      socket.emit('room:error', { message: '존재하지 않는 방입니다' });
      return;
    }
    if (room.status !== 'waiting') {
      if (room.status === 'playing') {
        this.handleSpectatorJoin(socket, code, room, playerName);
      } else {
        socket.emit('room:error', { message: '이미 종료된 방입니다' });
      }
      return;
    }
    if (room.players.length >= 4) {
      socket.emit('room:error', { message: '방이 가득 찼습니다 (최대 4명)' });
      return;
    }

    // 이미 다른 방에 있으면 먼저 나가기
    this.leaveCurrentRoom(socket);

    const session = room.addPlayer(playerName, socket.id);
    socket.data = { roomCode: code, playerIndex: session.playerIndex };
    socket.join(this.socketRoom(code));

    room.touch();
    // 참가한 플레이어에게 myPlayerIndex + sessionId 전달
    socket.emit('room:joined', { room: room.toRoomInfo(), myPlayerIndex: session.playerIndex, sessionId: session.sessionId });
    // 방 전체에 업데이트 브로드캐스트
    this.io.to(this.socketRoom(code)).emit('room:updated', { room: room.toRoomInfo() });
    console.log(`[방 참가] ${code} — ${playerName} (${room.players.length}명)`);
  }

  private handleSpectatorJoin(socket: IOSocket, roomCode: string, room: GameRoom, playerName: string): void {
    this.leaveCurrentRoom(socket);

    room.addSpectator(playerName, socket.id);
    socket.data = { roomCode, playerIndex: -1 };
    socket.join(this.socketRoom(roomCode));

    room.touch();

    socket.emit('room:spectator_joined', {
      roomCode,
      room: room.toRoomInfo(),
      gameState: room.gameState!,
      turnPhase: room.turnPhase,
      logs: room.logs,
    });

    this.io.to(this.socketRoom(roomCode)).emit('room:updated', { room: room.toRoomInfo() });
    console.log(`[관전 참가] ${roomCode} — ${playerName}`);
  }

  private handleReady(socket: IOSocket, ready: boolean): void {
    const { roomCode } = socket.data ?? {};
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'waiting') return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    player.ready = ready;
    room.touch();
    this.io.to(this.socketRoom(roomCode)).emit('room:updated', { room: room.toRoomInfo() });
  }

  private handleStart(socket: IOSocket): void {
    const { roomCode } = socket.data ?? {};
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'waiting') return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player || player.playerIndex !== room.hostIndex) {
      socket.emit('room:error', { message: '호스트만 게임을 시작할 수 있습니다' });
      return;
    }

    if (!room.canStart()) {
      socket.emit('room:error', { message: '모든 플레이어가 준비되어야 합니다 (최소 2명)' });
      return;
    }

    room.startGame();

    this.io.to(this.socketRoom(roomCode)).emit('room:updated', { room: room.toRoomInfo() });
    console.log(`[게임 시작] ${roomCode} — ${room.players.length}명`);

    this.broadcastAndCheckAutoSkip(roomCode, room);
  }

  private handleLeave(socket: IOSocket): void {
    this.leaveCurrentRoom(socket);
  }

  private handleDisconnect(socket: IOSocket): void {
    const { roomCode } = socket.data ?? {};
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    // 관전자 연결 끊김 → 즉시 제거
    if (room.getSpectatorBySocketId(socket.id)) {
      room.removeSpectator(socket.id);
      this.io.to(this.socketRoom(roomCode)).emit('room:updated', { room: room.toRoomInfo() });
      return;
    }

    if (room.status === 'waiting') {
      // 대기 중이면 방에서 제거
      room.removePlayer(socket.id);
      if (room.isEmpty()) {
        this.rooms.delete(roomCode);
        console.log(`[방 삭제] ${roomCode} — 비어있음`);
      } else {
        // 남은 플레이어들의 socket.data.playerIndex 업데이트
        for (const p of room.players) {
          const s = this.io.sockets.sockets.get(p.socketId);
          if (s) s.data.playerIndex = p.playerIndex;
        }
        this.io.to(this.socketRoom(roomCode)).emit('room:updated', { room: room.toRoomInfo() });
      }
    } else if (room.status === 'playing' || room.status === 'ended') {
      // 게임 중/종료이면 연결 끊김 표시
      const player = room.getPlayerBySocketId(socket.id);
      if (player) {
        player.connected = false;
        this.io.to(this.socketRoom(roomCode)).emit('player:disconnected', {
          playerName: player.name,
          playerIndex: player.playerIndex,
        });

        // 60초 후에도 재접속 안 하면 정리
        const timer = setTimeout(() => {
          this.disconnectTimers.delete(socket.id);
          if (room.players.every(p => !p.connected)) {
            this.clearTurnTimer(roomCode);
            this.rooms.delete(roomCode);
            console.log(`[방 삭제] ${roomCode} — 전원 연결 끊김`);
          }
        }, 60_000);
        this.disconnectTimers.set(socket.id, timer);

        // 끊긴 플레이어가 현재 턴이면 → 타이머 시작
        if (room.status === 'playing' && room.needsAutoSkip() && !this.turnTimers.has(roomCode)) {
          this.startTurnTimer(roomCode, room);
        }
      }
    }
  }

  private leaveCurrentRoom(socket: IOSocket): void {
    const { roomCode } = socket.data ?? {};
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    // 관전자인 경우
    if (room.getSpectatorBySocketId(socket.id)) {
      socket.leave(this.socketRoom(roomCode));
      room.removeSpectator(socket.id);
      socket.data = {};
      this.io.to(this.socketRoom(roomCode)).emit('room:updated', { room: room.toRoomInfo() });
      return;
    }

    socket.leave(this.socketRoom(roomCode));
    room.removePlayer(socket.id);
    socket.data = {};

    if (room.isEmpty()) {
      this.rooms.delete(roomCode);
      console.log(`[방 삭제] ${roomCode} — 비어있음`);
    } else {
      // 남은 플레이어들의 socket.data.playerIndex 업데이트
      for (const p of room.players) {
        const s = this.io.sockets.sockets.get(p.socketId);
        if (s) s.data.playerIndex = p.playerIndex;
      }
      this.io.to(this.socketRoom(roomCode)).emit('room:updated', { room: room.toRoomInfo() });
    }
  }

  private handleGameAction(socket: IOSocket, action: (room: GameRoom) => string | null): void {
    const { roomCode, playerIndex } = socket.data ?? {};
    if (!roomCode || playerIndex === undefined || playerIndex === null) return;
    if (playerIndex === -1) return; // 관전자는 액션 불가

    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState || room.status !== 'playing') return;

    const error = action(room);
    if (error) {
      socket.emit('game:error', { message: error });
      return;
    }

    room.touch();
    this.broadcastAndCheckAutoSkip(roomCode, room);
  }

  /** 게임 상태 브로드캐스트 후, 자동 스킵이 필요한지 확인 */
  private broadcastAndCheckAutoSkip(roomCode: string, room: GameRoom): void {
    // 기존 턴 타이머 정리
    this.clearTurnTimer(roomCode);

    // 상태 브로드캐스트 (플레이어)
    for (const p of room.players) {
      this.io.to(p.socketId).emit('game:state', {
        gameState: room.gameState!,
        turnPhase: room.turnPhase,
        myPlayerIndex: p.playerIndex,
        logs: room.logs,
      });
    }

    // 상태 브로드캐스트 (관전자)
    for (const s of room.spectators) {
      this.io.to(s.socketId).emit('game:state', {
        gameState: room.gameState!,
        turnPhase: room.turnPhase,
        myPlayerIndex: -1,
        logs: room.logs,
      });
    }

    // 게임 종료 시 방 상태 업데이트 후 종료
    if (room.status === 'ended') {
      this.io.to(this.socketRoom(roomCode)).emit('room:updated', { room: room.toRoomInfo() });
      return;
    }

    // 자동 스킵 체크
    if (room.needsAutoSkip()) {
      if (room.shouldSkipImmediately()) {
        // 퇴장 플레이어 → 즉시 스킵 (재귀적으로 다음 플레이어도 체크)
        room.skipCurrentTurn();
        this.broadcastAndCheckAutoSkip(roomCode, room);
      } else {
        // 끊김 플레이어 → 60초 카운트다운 시작
        this.startTurnTimer(roomCode, room);
      }
    }
  }

  private startTurnTimer(roomCode: string, room: GameRoom): void {
    if (!room.gameState) return;
    const idx = room.gameState.currentPlayerIndex;
    const playerName = room.gameState.players[idx].name;
    let remaining = GameRoom.TURN_TIMEOUT_SECONDS;

    // 즉시 첫 타이머 이벤트 전송
    this.io.to(this.socketRoom(roomCode)).emit('turn:timer', {
      remainingSeconds: remaining,
      playerName,
      playerIndex: idx,
    });

    const interval = setInterval(() => {
      remaining--;

      this.io.to(this.socketRoom(roomCode)).emit('turn:timer', {
        remainingSeconds: remaining,
        playerName,
        playerIndex: idx,
      });

      if (remaining <= 0) {
        this.clearTurnTimer(roomCode);
      }
    }, 1000);

    const timeout = setTimeout(() => {
      this.clearTurnTimer(roomCode);

      if (room.playerCount === 2) {
        // 2인 게임: 타임아웃 → 즉시 게임 종료, 남은 플레이어 승리
        room.forceWinByDisconnect(idx);
        console.log(`[게임 종료] ${roomCode} — ${playerName} 타임아웃, 상대 승리`);
      } else {
        // 3~4인 게임: 턴 스킵
        room.skipCurrentTurn();
        console.log(`[턴 스킵] ${roomCode} — ${playerName} (타임아웃)`);

        if (room.isAbandoned(idx)) {
          this.io.to(this.socketRoom(roomCode)).emit('player:abandoned', {
            playerName,
            playerIndex: idx,
          });
          console.log(`[퇴장] ${roomCode} — ${playerName} (${GameRoom.MAX_SKIPS}회 스킵)`);
        }
      }

      this.broadcastAndCheckAutoSkip(roomCode, room);
    }, GameRoom.TURN_TIMEOUT_SECONDS * 1000);

    this.turnTimers.set(roomCode, { timeout, interval });
  }

  private clearTurnTimer(roomCode: string): void {
    const timer = this.turnTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer.timeout);
      clearInterval(timer.interval);
      this.turnTimers.delete(roomCode);
    }
  }

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code);
  }
}
