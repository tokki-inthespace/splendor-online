import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientEvents, ServerEvents } from '../src/protocol.js';
import { RoomManager } from './RoomManager.js';

const PORT = Number(process.env.PORT) || 3001;

const httpServer = createServer();
const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: {
    origin: '*',
  },
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  console.log(`[연결] ${socket.id}`);
  roomManager.registerSocket(socket);
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO 서버 실행 중: http://localhost:${PORT}`);
});
