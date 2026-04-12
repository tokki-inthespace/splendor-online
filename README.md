# Splendor Online

스플렌더(Splendor) 보드게임을 웹에서 플레이할 수 있는 프로젝트입니다.

**https://splendor-online-production.up.railway.app**

## 기능

- **싱글플레이** — AI(Greedy) 상대로 1:1 대전
- **멀티플레이** — Socket.IO 기반 실시간 2~4인 대전
  - 4자리 초대 코드로 방 생성/참가
  - 로비에서 준비 → 호스트가 게임 시작
  - 연결 끊김 시 60초 타임아웃 + 자동 스킵/종료

## 스플렌더란?

르네상스 시대의 보석 상인이 되어 보석 토큰을 모으고, 개발 카드를 구매해 승점을 쌓는 엔진 빌딩 보드게임입니다.
15점을 먼저 달성하면 그 라운드를 마저 진행한 뒤 최고 점수자가 승리합니다.

## 기술 스택

- **프론트엔드**: React 19 + TypeScript + Vite + Zustand
- **백엔드**: Node.js + Socket.IO
- **배포**: Railway

## 시작하기

```bash
npm install
npm run dev          # Vite + Socket.IO 서버 동시 실행
```

### 프로덕션 빌드

```bash
npm run build        # Vite 프로덕션 빌드
npm start            # 서버 실행 (정적 파일 서빙 + WebSocket)
```

## 프로젝트 구조

```
├── server/              # Socket.IO 서버
│   ├── index.ts         # 서버 진입점 (정적 파일 서빙 포함)
│   ├── RoomManager.ts   # 방 생성/참가/게임 이벤트 라우팅
│   └── GameRoom.ts      # 방별 게임 상태 + 액션 처리
├── src/
│   ├── protocol.ts      # 클라이언트/서버 공유 이벤트 타입
│   ├── types/game.ts    # 게임 타입 정의
│   ├── game/
│   │   ├── gameLogic.ts # 게임 규칙 (순수 함수, 서버/클라이언트 공유)
│   │   ├── cardData.ts  # 카드/귀족 데이터
│   │   └── aiLogic.ts   # AI 로직 (싱글플레이용)
│   ├── store/
│   │   ├── gameStore.ts        # 싱글플레이 상태 관리
│   │   └── multiplayerStore.ts # 멀티플레이 상태 관리
│   └── components/      # React UI 컴포넌트
```

## 구현 계획

[PLAN.md](./PLAN.md) 참고
