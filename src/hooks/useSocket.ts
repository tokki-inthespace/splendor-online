import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '../protocol';

type TypedSocket = Socket<ServerEvents, ClientEvents>;

let socket: TypedSocket | null = null;

export function getSocket(auth?: Record<string, string>): TypedSocket {
  if (!socket) {
    socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth,
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
