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

          // 방에 남은 플레이어들에게 소켓 정리
          for (const p of room.players) {
            const s = this.io.sockets.sockets.get(p.socketId);
            if (s) {
              s.leave(this.socketRoom(code));
              s.data = {};
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
    // 로비 이벤트
    socket.on('room:create', ({ playerName }) => this.handleCreate(socket, playerName));
    socket.on('room:join', ({ roomCode, playerName }) => this.handleJoin(socket, roomCode, playerName));
    socket.on('room:ready', ({ ready }) => this.handleReady(socket, ready));
    socket.on('room:start', () => this.handleStart(socket));
    socket.on('room:leave', () => this.handleLeave(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));

    // 게임 액션 이벤트
    socket.on('game:takeTokens', ({ tokens }) => this.handleGameAction(socket, room => room.handleTakeTokens(socket.data.playerIndex, tokens)));
    socket.on('game:purchaseCard', ({ cardId }) => this.handleGameAction(socket, room => room.handlePurchaseCard(socket.data.playerIndex, cardId)));
    socket.on('game:reserveCard', ({ cardId }) => this.handleGameAction(socket, room => room.handleReserveCard(socket.data.playerIndex, cardId)));
    socket.on('game:reserveCardFromDeck', ({ level }) => this.handleGameAction(socket, room => room.handleReserveCardFromDeck(socket.data.playerIndex, level)));
    socket.on('game:discardTokens', ({ tokens }) => this.handleGameAction(socket, room => room.handleDiscardTokens(socket.data.playerIndex, tokens)));
    socket.on('game:undoAction', () => this.handleGameAction(socket, room => room.handleUndoAction(socket.data.playerIndex)));
    socket.on('game:confirmTurn', () => this.handleGameAction(socket, room => room.handleConfirmTurn(socket.data.playerIndex)));
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
    socket.emit('room:created', { roomCode: code, room: room.toRoomInfo(), myPlayerIndex: session.playerIndex });
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
      socket.emit('room:error', { message: '이미 게임이 시작된 방입니다' });
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
    // 참가한 플레이어에게 myPlayerIndex 전달
    socket.emit('room:joined', { room: room.toRoomInfo(), myPlayerIndex: session.playerIndex });
    // 방 전체에 업데이트 브로드캐스트
    this.io.to(this.socketRoom(code)).emit('room:updated', { room: room.toRoomInfo() });
    console.log(`[방 참가] ${code} — ${playerName} (${room.players.length}명)`);
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
    const { roomCode } = socket.data ?? {};
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) return;

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

    // 상태 브로드캐스트
    for (const p of room.players) {
      this.io.to(p.socketId).emit('game:state', {
        gameState: room.gameState!,
        turnPhase: room.turnPhase,
        myPlayerIndex: p.playerIndex,
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
