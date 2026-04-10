# Splendor Online - 구현 계획

## 프로젝트 목표
- **1차 스콥**: 싱글플레이 (플레이어 1명 vs AI 1명)
- **2차 스콥**: 멀티플레이 실시간 게임 (WebSocket 기반)

## 기술 스택
- React + TypeScript + Vite
- 상태관리: Zustand
- 스타일링: CSS (App.css 단일 파일)

---

## 현재 완료된 것
- `src/types/game.ts` — 타입 정의 (Card, Noble, Player, GameState 등)
- `src/game/cardData.ts` — 카드 데이터 (레벨1 40장, 레벨2 30장, 레벨3 20장, 귀족 10장)
- `src/game/gameLogic.ts` — 게임 규칙 & 액션 로직 (초기화, 토큰/카드/예약, 귀족, 승리, 턴 관리)
- `src/store/gameStore.ts` — Zustand 스토어 (상태 관리, 턴 흐름, 액션 취소, AI 턴 구조)
- `src/utils/gemColors.ts` — 보석 색상 상수
- `src/components/Board/` — Board, CardRow, CardSlot, NobleRow, TokenPool
- `src/components/Player/PlayerPanel.tsx` — 플레이어 패널 (토큰, 구매 카드, 예약 카드, 귀족)
- `src/components/Game.tsx` — 메인 게임 화면 + 인터랙션 (토큰 선택, 카드 구매/예약, 버리기, 확정/취소)
- `src/App.tsx` — 시작 화면 → 게임 전환
- `src/App.css` — 다크 테마 기반 전체 스타일

---

## 파일 구조

```
src/
├── types/
│   └── game.ts                ✅
├── game/
│   ├── cardData.ts            ✅
│   ├── gameLogic.ts           ✅
│   └── aiLogic.ts             🔲 AI 턴 처리
├── store/
│   └── gameStore.ts           ✅
├── utils/
│   └── gemColors.ts           ✅
├── components/
│   ├── Board/
│   │   ├── Board.tsx          ✅
│   │   ├── CardRow.tsx        ✅
│   │   ├── CardSlot.tsx       ✅
│   │   ├── NobleRow.tsx       ✅
│   │   └── TokenPool.tsx      ✅
│   ├── Player/
│   │   └── PlayerPanel.tsx    ✅
│   └── Game.tsx               ✅
├── App.tsx                    ✅
└── App.css                    ✅
```

---

## Phase 1: 게임 로직 — ✅ 완료

`src/game/gameLogic.ts`에 구현 완료:
- `initGame` — 덱 셔플, 카드 공개, 귀족 배치, 토큰 세팅
- `takeTokens` — 다른 색 1~3개 또는 같은 색 2개(4개 이상일 때)
- `purchaseCard` — 보너스→토큰→골드 순 비용 차감, 덱 보충
- `reserveCard` / `reserveCardFromDeck` — 예약 + 골드 지급
- `discardTokens` — 정확히 10개로 맞춰야 함
- `checkNobles` — 조건 충족 귀족 모두 획득
- `checkWin` — 라운드 종료 시 최고 점수자 승리, 동점 시 카드 적은 쪽
- `endTurn` — 귀족 → 승리 체크 → 턴 넘김

---

## Phase 2: 상태 관리 — ✅ 완료

`src/store/gameStore.ts`에 구현 완료:
- `turnPhase` (idle → action / discarding) 흐름 제어
- `previousState`로 액션 취소 지원
- 모든 액션에 `turnPhase !== 'idle'` 가드
- `confirmTurn`에 `turnPhase !== 'action'` 가드 (버리기 강제)
- AI 턴: setTimeout(1초) 후 실행 구조 (TODO: aiLogic 연결)

---

## Phase 3: UI 컴포넌트 — ✅ 완료

### 보드 레이아웃
```
+──────────────────────────────────────────+
│                 AI 패널                   │
+──────────────────────────────────────────+
│                            │             │
│  [III] [카드][카드][카드][카드] │  귀족       │
│  [II]  [카드][카드][카드][카드] │  (컴팩트)   │
│  [I]   [카드][카드][카드][카드] │             │
│                            │             │
+──────────────────────────────────────────+
│    [⚪] [⚫] [🔴] [🔵] [🟢] [★]         │
+──────────────────────────────────────────+
│                 내 패널                   │
│  토큰 | 구매 카드(미니) | 예약 | 귀족     │
+──────────────────────────────────────────+
```

### 인터랙션 (Game.tsx에서 처리)
1. ✅ 토큰 클릭으로 선택 → 가져오기 확인
2. ✅ 카드 클릭 → 구매/예약 모달
3. ✅ 덱 클릭 → 덱에서 예약
4. ✅ 예약 카드 클릭 → 구매 모달
5. ✅ 토큰 10개 초과 → 버리기 모달
6. ✅ 턴 확정 / 취소(되돌리기)
7. ✅ 게임 종료 화면

---

## Phase 4: AI 로직 — 🔲 다음 작업

`src/game/aiLogic.ts` 구현 필요:
1. 구매 가능한 카드 중 점수 가장 높은 카드 구매
2. 구매 가능한 카드 없으면 → 가장 저렴한 카드 기준으로 부족한 토큰 수집
3. 예약은 거의 안 함 (단순화)
4. gameStore.ts의 AI 턴 TODO에 연결

---

## 스플렌더 핵심 규칙 요약 (구현 참고용)

- 턴당 하나의 액션만 수행
- 토큰 보유 한도: 10개 (초과 시 즉시 버려야 함)
- 예약 카드 한도: 3장
- 귀족 방문: 자동
- 게임 종료 트리거: 누군가 15점 달성 → 해당 라운드 끝까지 플레이 → 최고 점수자 승리

---

## 결정된 사항
- [x] 스타일링: CSS 단일 파일 (App.css), 나중에 일러스트 교체 가능
- [x] 토큰 버리기: 모달 방식
- [x] 귀족 중복 충족 시: 모두 획득
- [x] 보석 색상 순서: white → black → red → blue → green

## 미결 결정 사항
- [ ] 게임 로그 패널 포함 여부
- [ ] 덱에서 예약 시 카드 앞면/뒷면 표시

## 작업 순서
1. ~~`gameLogic.ts` (핵심 로직)~~ ✅
2. ~~`gameStore.ts` (Zustand 연결)~~ ✅
3. ~~기본 UI: Board, CardSlot, PlayerPanel~~ ✅
4. ~~인터랙션 (모달, 토큰 선택)~~ ✅
5. ~~레이아웃 개선~~ ✅
6. `aiLogic.ts` ← 다음
7. 스타일링 / 폴리싱
