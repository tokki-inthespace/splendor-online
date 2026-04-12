import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '../protocol';

type TypedSocket = Socket<ServerEvents, ClientEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io({
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
