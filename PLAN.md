# Splendor Online - 구현 계획

## 프로젝트 목표
- **1차 스콥**: 싱글플레이 (플레이어 1명 vs AI) — ✅ 완료
- **2차 스콥**: 실시간 멀티플레이 (WebSocket 기반) — ✅ 완료
- **3차 스콥**: 일러스트 / 비주얼 폴리싱

## 기술 스택
- React + TypeScript + Vite
- 상태관리: Zustand
- 스타일링: CSS (App.css 단일 파일)
- 멀티플레이: Socket.IO
- 배포: Railway

---

## 1차 스콥 완료 현황

### 완료된 파일

```
src/
├── types/
│   └── game.ts                ✅ 타입 정의
├── game/
│   ├── cardData.ts            ✅ 카드/귀족 데이터
│   ├── gameLogic.ts           ✅ 게임 규칙 & 액션 (순수 함수)
│   └── aiLogic.ts             ✅ Greedy AI
├── store/
│   └── gameStore.ts           ✅ Zustand 상태 + 게임 로그
├── utils/
│   └── gemColors.ts           ✅ 색상 상수 + 헬퍼
├── components/
│   ├── Board/
│   │   ├── Board.tsx          ✅ 보드 레이아웃 (좌: 카드, 우: 귀족)
│   │   ├── CardRow.tsx        ✅ 레벨별 카드 행
│   │   ├── CardSlot.tsx       ✅ 카드 한 장
│   │   ├── NobleRow.tsx       ✅ 귀족 타일 (컴팩트)
│   │   └── TokenPool.tsx      ✅ 토큰 풀
│   ├── Player/
│   │   └── PlayerPanel.tsx    ✅ 플레이어 패널 (토큰 N/10, 보너스, 카드, 예약, 귀족)
│   └── Game.tsx               ✅ 메인 게임 + 인터랙션
├── App.tsx                    ✅ 시작 화면 → 게임
└── App.css                    ✅ 다크 테마 스타일
```

### 완료된 Phase 요약

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 게임 로직 (gameLogic.ts) | ✅ |
| Phase 2 | 상태 관리 (gameStore.ts + 게임 로그) | ✅ |
| Phase 3 | UI 컴포넌트 + 인터랙션 + 레이아웃 | ✅ |
| Phase 4 | AI 로직 (aiLogic.ts) | ✅ |

---

## 2차 스콥: 실시간 멀티플레이 — ✅ 완료

### 구현 내용

**서버 (server/)**
- Socket.IO 서버 (`server/index.ts`) — 프로덕션에서 정적 파일 서빙 포함
- 방 관리 (`server/RoomManager.ts`) — 4자리 초대 코드, 생성/참가/레디/시작
- 게임 룸 (`server/GameRoom.ts`) — 서버 권위적 gameLogic 실행, 상태 브로드캐스트

**프로토콜 (src/protocol.ts)**
- Client → Server: room:create, room:join, room:ready, room:start, game:* 액션
- Server → Client: room:created, room:updated, game:state, turn:timer, player:*

**클라이언트**
- `src/hooks/useSocket.ts` — Socket.IO 싱글턴 연결
- `src/store/multiplayerStore.ts` — 소켓 기반 로비/게임 상태 관리
- `src/components/Lobby.tsx` — 방 코드 표시, 플레이어 목록, 레디/시작
- `src/components/Game.tsx` — useGameActions 훅으로 싱글/멀티 스토어 선택
- `src/App.tsx` — 모드 선택 (싱글/멀티), 로비 → 게임 라우팅

**주요 기능**
- 2~4인 실시간 대전 (서버 권위적, optimistic update 없음)
- 인원별 레이아웃: 2인 세로, 3인 상+좌, 4인 상+좌+우 (CSS Grid)
- 턴 타임아웃: 끊긴 플레이어 60초 카운트다운
  - 2인: 타임아웃 시 즉시 게임 종료 (남은 플레이어 승리)
  - 3~4인: 턴 스킵 → 3회 연속 스킵 시 퇴장
- 카드 구매/예약 시 덱 보충을 턴 확정까지 지연 (치팅 방지)
- 기존 싱글플레이(vs AI) 모드 완전 유지

**배포**
- Railway (https://splendor-online-production.up.railway.app)
- `npm run build` → Vite 프로덕션 빌드
- `npm start` → Node.js 서버 (정적 파일 + WebSocket)

---

## 3차 스콥: 일러스트 / 비주얼 폴리싱

- CSS 배경색 → 보석 이미지/SVG 아이콘 교체
- 카드 일러스트 추가
- 귀족 타일 이미지
- 애니메이션 (카드 구매, 토큰 이동 등)
- 사운드 효과 (선택)

---

## 스플렌더 핵심 규칙 요약 (구현 참고용)

- 턴당 하나의 액션만 수행
- 토큰 보유 한도: 10개 (초과 시 즉시 버려야 함)
- 예약 카드 한도: 3장
- 귀족 방문: 자동
- 게임 종료 트리거: 누군가 15점 달성 → 해당 라운드 끝까지 플레이 → 최고 점수자 승리

---

## 결정된 사항
- [x] 스타일링: CSS 단일 파일 → 나중에 일러스트 교체
- [x] 토큰 버리기: 모달 방식
- [x] 귀족 중복 충족 시: 모두 획득
- [x] 보석 색상 순서: white → black → red → blue → green
- [x] 게임 로그: 스토어에 기록 (UI 노출은 나중에)
- [x] 작업 순서: 멀티플레이 → 일러스트 (구조 변경 먼저, 비주얼은 마지막)
- [x] 멀티플레이 서버: Socket.IO
- [x] 방 시스템: 4자리 초대 코드
- [x] 플레이어 수: 2~4인
- [x] 싱글플레이 유지: 시작 화면에서 모드 선택
- [x] 배포: Railway
