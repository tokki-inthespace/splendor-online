# Splendor Online - 구현 계획

## 프로젝트 목표
- **1차 스콥**: 싱글플레이 (플레이어 1명 vs AI) — ✅ 완료
- **2차 스콥**: 실시간 멀티플레이 (WebSocket 기반) — ✅ 완료
- **2.5차 스콥**: 재접속 + 관전 + UX 개선 + 이모트 — ✅ 완료
- **3차 스콥**: 일러스트 / 비주얼 폴리싱 — 🚧 진행 중

## 기술 스택
- React 19 + TypeScript + Vite
- 상태관리: Zustand
- 스타일링: CSS (App.css 단일 파일)
- 멀티플레이: Socket.IO
- 배포: Railway (https://splendor-online-production.up.railway.app)

---

## 1차 스콥 — 싱글플레이 ✅ 완료

### 완료된 파일

```
src/
├── types/
│   └── game.ts                ✅ 타입 정의
├── game/
│   ├── cardData.ts            ✅ 카드/귀족 데이터 (고정 ID: l1-01, n-01 형식)
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

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 게임 로직 (gameLogic.ts) | ✅ |
| Phase 2 | 상태 관리 (gameStore.ts + 게임 로그) | ✅ |
| Phase 3 | UI 컴포넌트 + 인터랙션 + 레이아웃 | ✅ |
| Phase 4 | AI 로직 (aiLogic.ts) | ✅ |

---

## 2차 스콥 — 실시간 멀티플레이 ✅ 완료

**서버 (server/)**
- Socket.IO 서버 (`server/index.ts`) — 프로덕션에서 정적 파일 서빙 포함
- 방 관리 (`server/RoomManager.ts`) — 4자리 초대 코드, 생성/참가/레디/시작/GC
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
- 방 GC: 종료 5분, 대기 30분, 진행 15분
- 기존 싱글플레이(vs AI) 모드 완전 유지

**배포**
- Railway — 자동배포 미설정, `railway up -d`로 수동 배포
- `npm run build` → Vite 프로덕션 빌드
- `npm start` → Node.js 서버 (정적 파일 + WebSocket)

---

## 2.5차 스콥 — 재접속 / 관전 / UX 개선 / 이모트 ✅ 완료

### 재접속
- sessionId(UUID) 기반 자가 복구
- sessionStorage 저장 → Socket.IO `auth`로 전달 → 서버가 기존 세션 매칭
- 재접속 실패(방 GC 등) 시 `room:reconnect_failed` → 메뉴 자동 복귀
- 재접속 플레이어가 현재 턴이면 턴 타이머 자동 중단

### 관전 (spectator)
- 게임 중인 방 코드 입력 시 관전자로 참가 (서버에서 자동 전환)
- 대기실에서 플레이어 ↔ 관전자 토글 가능
- 관전자 목록 별도 섹션 + 인게임 좌상단 fixed 리스트
- 관전자에게도 실시간 `game:state` 수신
- 관전자는 이모트 송신 불가, 수신만 가능

### UX 개선
- 카드 보충 시 기존 카드 위치 유지 (visibleCards에 null 슬롯 → refill 시 교체)
- 보석 색상 순서: white → blue → green → red → black (일관화)
- 승리 모달에 다시하기/처음으로 버튼
- 토큰 버리기 모달 우클릭으로 -1 가능
- 상대 턴에 버리기 모달 노출되던 버그 수정 (isMyTurn 조건 추가)
- 덱 예약 카드 뒷면 처리 (치팅 방지)
- 파비콘 토끼 아이콘

### 이모트 시스템
- 고정 프리셋 6종: 👍 👎 😄 😴 🥲 😡
- 하스스톤식 피커 팝오버 (좌하단 fixed, 😀 트리거 버튼)
- 서버 3초 쿨다운 강제, 관전자 수신 허용 (송신 불가)
- 말풍선 배치: 일반 플레이어는 패널 위쪽, 상단 플레이어는 우측 (화면 잘림 방지)
- 외부 클릭 시 팝오버 자동 닫힘
- z-index: 모달 뒤로 (카드 액션/토큰 버리기 모달과 충돌 방지)

### 3/4인 중앙 레이아웃 개선
- `.seat-center min-width: 650px` 확보 → 카드 너비 찌그러짐 방지
- `.card-slot min-width: 100px` 하한 설정
- 뷰포트 좁을 때 자동 가로 스크롤

---

## 3차 스콥 — 일러스트 / 비주얼 폴리싱 🚧 진행 중

### 인프라 ✅ 완료

**렌더 시스템**
- `src/components/Art/CardArt.tsx` — 카드 일러스트 (onError 자가 숨김)
- `src/components/Art/NobleArt.tsx` — 귀족 일러스트
- `src/components/Art/CardBackArt.tsx` — 덱 뒷면 일러스트
- `src/utils/cardArt.ts` — URL 헬퍼 (`/illustrations/{cards|nobles|cards/back}/{id}.webp`)
- `src/utils/artManifest.ts` — manifest 기반 선택적 로드 (404 요청 방지)

**통합 지점**
- `CardSlot.tsx`, `NobleRow.tsx`, `CardRow.tsx` — Art 컴포넌트 삽입
- `App.css` — `:has()` 셀렉터로 일러스트 있을 때만 반투명 오버레이 적용
- `server/index.ts` — WebP/JPG MIME 타입 추가 (프로덕션 서빙)

**매니페스트 관리 (`public/illustrations/manifest.json`)**
- `cards`, `nobles`, `cardBacks` 세 배열로 등록된 ID만 로드
- 등록 안 된 카드는 요청 자체 스킵 → 404 로그 없음
- 파일 drop + manifest 등록 → 브라우저 새로고침으로 반영 (재빌드 불필요)

**파일 규약**
| 종류 | 폴더 | 파일명 | 예시 |
|---|---|---|---|
| 레벨 1 카드 | `public/illustrations/cards/` | `l1-01.webp` ~ `l1-40.webp` | `l1-05.webp` |
| 레벨 2 카드 | `public/illustrations/cards/` | `l2-01.webp` ~ `l2-30.webp` | `l2-12.webp` |
| 레벨 3 카드 | `public/illustrations/cards/` | `l3-01.webp` ~ `l3-20.webp` | `l3-07.webp` |
| 덱 뒷면 | `public/illustrations/cards/back/` | `l1.webp`, `l2.webp`, `l3.webp` | `l1.webp` |
| 귀족 | `public/illustrations/nobles/` | `n-01.webp` ~ `n-10.webp` | `n-03.webp` |

각 ID의 실제 카드 속성(색상/점수/비용)은 `src/game/cardData.ts`에서 확인.

### 완료된 일러스트 ✅

- [x] 덱 뒷면 3장 (l1, l2, l3)
- [x] 귀족 10장 (n-01 ~ n-10)
- [x] 귀족 타일 오버레이 CSS 개선 (좌상단 금색 점수 뱃지 + 하단 반투명 요구량 스트립)

### 남은 일러스트 — 카드 앞면 90장 🚧

**레벨 1 카드 (40장)** — `l1-01` ~ `l1-40`
- [ ] `l1-01` ~ `l1-10`
- [ ] `l1-11` ~ `l1-20`
- [ ] `l1-21` ~ `l1-30`
- [ ] `l1-31` ~ `l1-40`

**레벨 2 카드 (30장)** — `l2-01` ~ `l2-30`
- [ ] `l2-01` ~ `l2-10`
- [ ] `l2-11` ~ `l2-20`
- [ ] `l2-21` ~ `l2-30`

**레벨 3 카드 (20장)** — `l3-01` ~ `l3-20`
- [ ] `l3-01` ~ `l3-10`
- [ ] `l3-11` ~ `l3-20`

### 작업 워크플로 (카드 1장당)

1. **외부 툴에서 이미지 생성** — cardData.ts에서 해당 ID의 색상/점수/비용 참고하여 테마 결정
2. **WebP로 변환** — `cwebp -q 82 input.png -o l1-05.webp`
3. **파일 배치** — `public/illustrations/cards/l1-05.webp`
4. **manifest.json 등록** — `"cards": ["l1-05", ...]` 배열에 ID 추가
5. **브라우저 새로고침** — 해당 카드만 일러스트 적용 확인
6. **일정량 모이면 커밋 + Railway 배포**

### 권장 제작 스펙

- 해상도: 400 × 560px (카드 비율 5:7)
- 포맷: WebP, 품질 82 (그라데이션 많으면 85)
- 각 장 평균 ~50KB 예상, 전체 90장 약 4.5MB
- 카드 색상에 맞는 테마 (black=석탄/가죽, white=대리석/양모 등)

### 이후 폴리싱 (카드 일러스트 완료 후)

- [ ] 보석 토큰 일러스트/SVG (현재 컬러 원형 → 스타일리시한 보석 아이콘)
- [ ] 배경 텍스처 (보드 나무결 등)
- [ ] 애니메이션: 카드 구매 시 플립/이동, 토큰 획득 시 슬라이드
- [ ] 사운드 효과 (선택)
- [ ] 승리 연출 강화

---

## 스플렌더 핵심 규칙 요약 (구현 참고용)

- 턴당 하나의 액션만 수행
- 토큰 보유 한도: 10개 (초과 시 즉시 버려야 함)
- 예약 카드 한도: 3장
- 귀족 방문: 자동, 중복 충족 시 모두 획득
- 게임 종료 트리거: 누군가 15점 달성 → 해당 라운드 끝까지 플레이 → 최고 점수자 승리

---

## 결정된 사항

- [x] 스타일링: CSS 단일 파일 → 일러스트는 manifest 기반 점진 교체
- [x] 토큰 버리기: 모달 방식
- [x] 귀족 중복 충족 시: 모두 획득
- [x] 보석 색상 순서: white → blue → green → red → black
- [x] 게임 로그: 스토어에 기록 (UI 노출은 나중에)
- [x] 작업 순서: 멀티플레이 → 일러스트 (구조 변경 먼저, 비주얼은 마지막)
- [x] 멀티플레이 서버: Socket.IO
- [x] 방 시스템: 4자리 초대 코드
- [x] 플레이어 수: 2~4인
- [x] 싱글플레이 유지: 시작 화면에서 모드 선택
- [x] 배포: Railway (수동 배포 `railway up -d`)
- [x] 카드 ID 형식: `l{level}-{index}` (예: `l1-05`), 귀족 `n-{index}`
- [x] 일러스트 포맷: WebP (품질 82)
- [x] 일러스트 등록: `public/illustrations/manifest.json` ID 기반
