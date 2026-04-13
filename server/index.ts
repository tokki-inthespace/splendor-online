import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import type { ClientEvents, ServerEvents } from '../src/protocol.js';
import { RoomManager } from './RoomManager.js';

const PORT = Number(process.env.PORT) || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const isProduction = existsSync(DIST_DIR);

// 프로덕션: Vite 빌드 결과물 서빙
const httpServer = createServer((req, res) => {
  if (!isProduction) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = req.url === '/' ? '/index.html' : req.url!;

  // Socket.IO 경로는 무시
  if (url.startsWith('/socket.io')) return;

  const filePath = join(DIST_DIR, url);
  try {
    // 파일이 존재하면 서빙, 없으면 index.html (SPA fallback)
    const target = existsSync(filePath) ? filePath : join(DIST_DIR, 'index.html');
    const content = readFileSync(target);

    const ext = target.split('.').pop();
    const mimeTypes: Record<string, string> = {
      html: 'text/html',
      js: 'application/javascript',
      css: 'text/css',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext ?? ''] ?? 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

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
  console.log(`서버 실행 중: http://localhost:${PORT}${isProduction ? ' (프로덕션)' : ' (개발)'}`);
});
