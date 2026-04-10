# Splendor Online - 구현 계획

## 프로젝트 목표
- **1차 스콥**: 싱글플레이 (플레이어 1명 vs AI 1명)
- **2차 스콥**: 멀티플레이 실시간 게임 (WebSocket 기반)

## 기술 스택
- React + TypeScript + Vite (기존)
- 상태관리: Zustand
- 스타일링: 미결 (CSS Modules vs Tailwind)

---

## 현재 완료된 것
- `src/types/game.ts` — 타입 정의 완료 (Card, Noble, Player, GameState 등)
- `src/game/cardData.ts` — 카드 데이터 완료 (레벨1 40장, 레벨2 30장, 레벨3 20장, 귀족 10장)

---

## 목표 파일 구조

```
src/
├── types/
│   └── game.ts                ✅ 완료
├── game/
│   ├── cardData.ts            ✅ 완료
│   ├── gameLogic.ts           🔲 게임 규칙 & 액션 로직
│   └── aiLogic.ts             🔲 AI 턴 처리
├── store/
│   └── gameStore.ts           🔲 Zustand 전역 상태
├── components/
│   ├── Board/
│   │   ├── Board.tsx          🔲 전체 보드 레이아웃
│   │   ├── CardRow.tsx        🔲 레벨별 카드 4장 + 덱
│   │   ├── CardSlot.tsx       🔲 카드 한 장 표시
│   │   ├── NobleRow.tsx       🔲 귀족 타일 행
│   │   └── TokenPool.tsx      🔲 공용 토큰 풀
│   ├── Player/
│   │   ├── PlayerPanel.tsx    🔲 플레이어 정보 패널
│   │   ├── TokenHand.tsx      🔲 보유 토큰
│   │   ├── CardCollection.tsx 🔲 구매한 카드
│   │   └── ReservedCards.tsx  🔲 예약 카드
│   └── UI/
│       ├── TokenPicker.tsx    🔲 토큰 선택 모달
│       └── GameLog.tsx        🔲 게임 로그 (옵션)
└── App.tsx
```

---

## Phase 1: 게임 로직 (`src/game/gameLogic.ts`)

### 게임 초기화
```
initGame(playerNames: string[]) → GameState
```
- 레벨별 덱 셔플
- 레벨별 카드 4장씩 공개
- 귀족 타일 랜덤 배치 (플레이어 수 + 1장)
- 토큰 배치: 2인→각 색 4개 / 3인→5개 / 4인→7개, 골드 항상 5개
- 플레이어 초기화 (토큰/카드/귀족 모두 0)

### 액션 1: 토큰 가져오기
```
takeTokens(state, tokens: Partial<TokenMap>) → GameState
```
- 유효성: 서로 다른 색 최대 3개 OR 같은 색 2개 (해당 색 4개 이상 있을 때)
- 보유 토큰 10개 초과 시 → 버리기 단계 필요 (phase: 'discarding')

### 액션 2: 카드 구매
```
purchaseCard(state, card: Card) → GameState
```
- 유효성: 공개 카드 또는 본인 예약 카드에 있어야 함
- 비용 계산 순서: 보유 카드 보너스(할인) → 부족분을 토큰으로 → 그래도 부족하면 골드로 충당
- 구매 후 해당 자리에 덱에서 새 카드 공개
- 귀족 획득 체크 자동 실행

### 액션 3: 카드 예약
```
reserveCard(state, card: Card | { level: 1|2|3, fromDeck: true }) → GameState
```
- 유효성: 예약 카드 3장 미만
- 공개 카드 또는 덱 최상단에서 가져올 수 있음
- 골드 토큰 1개 받기 (공용 풀에 있으면)
- 덱에서 예약한 경우 다음 카드 공개

### 자동 처리: 귀족 획득
```
checkNobles(state) → GameState
```
- 카드 구매 후 자동 호출
- 조건: 특정 색 카드를 N장 이상 보유
- 조건 충족 귀족이 여럿이면 모두 획득 (싱글플레이에서는 첫 번째로 단순화 가능)

### 자동 처리: 승리 체크
```
checkWin(state) → GameState
```
- 15점 이상인 플레이어가 생기면 해당 라운드를 끝까지 진행
- 라운드 종료 후: 최고 점수자 승리, 동점이면 구매 카드 수가 적은 쪽 승리

### 턴 종료
```
endTurn(state) → GameState
```
- currentPlayerIndex 증가
- AI 플레이어 턴이면 aiLogic 호출

---

## Phase 2: 상태 관리 (`src/store/gameStore.ts`)

Zustand 스토어로 GameState 관리:
- `startGame(playerName: string)` — AI 포함 2인 게임 초기화
- `takeTokens(tokens)`, `purchaseCard(card)`, `reserveCard(card)` — 액션 디스패치
- `discardToken(color)` — 10개 초과 시 버리기
- AI 턴: `useEffect`로 약간의 딜레이(1초 내외) 후 자동 실행

---

## Phase 3: UI 컴포넌트

### 보드 레이아웃 (중앙 영역)
```
[귀족 타일들]
[레벨3 덱] [카드] [카드] [카드] [카드]
[레벨2 덱] [카드] [카드] [카드] [카드]
[레벨1 덱] [카드] [카드] [카드] [카드]
[토큰 풀: white / black / red / blue / green / gold]
```

### 플레이어 패널 (하단 — 내 플레이어)
- 보유 토큰 수량
- 카드 보너스 합계 (색상별 숫자)
- 구매한 카드 (색상별로 그룹)
- 예약 카드 (앞면)
- 획득한 귀족
- 총 점수

### AI 패널 (상단 — 상대)
- 동일하지만 예약 카드는 뒷면으로 표시

### 인터랙션 플로우
1. **토큰 가져오기**: 토큰 클릭으로 선택 → 확인 버튼
2. **카드 클릭**: 구매 / 예약 선택 팝업 → 확인
3. **예약 카드 클릭**: 구매 확인
4. **토큰 버리기**: 10개 초과 시 버릴 토큰 선택 모달
5. **액션 취소**: 실행했던 액션을 취소하고 다시 하기

---

## Phase 4: AI 로직 (`src/game/aiLogic.ts`)

기본 Greedy AI (단순하게 시작):
1. 구매 가능한 카드 중 점수 가장 높은 카드 구매
2. 구매 가능한 카드 없으면 → 가장 저렴한 카드 기준으로 부족한 토큰 수집
3. 예약은 거의 안 함 (단순화)

---

## 스플렌더 핵심 규칙 요약 (구현 참고용)

- 턴당 하나의 액션만 수행
- 토큰 보유 한도: 10개 (초과 시 즉시 버려야 함)
- 예약 카드 한도: 3장
- 귀족 방문: 자동
- 게임 종료 트리거: 누군가 15점 달성 → 해당 라운드 끝까지 플레이 → 최고 점수자 승리

---

## 미결 결정 사항
- [ ] 스타일링 방식: CSS Modules vs Tailwind
- [ ] 토큰 버리기 UX (인라인 vs 모달)
- [ ] 게임 로그 패널 포함 여부
- [ ] 덱에서 예약 시 카드 앞면/뒷면 표시

## 작업 순서
1. `gameLogic.ts` (핵심 로직, 테스트 가능하게)
2. `gameStore.ts` (Zustand 연결)
3. 기본 UI: Board, CardSlot, PlayerPanel
4. `aiLogic.ts`
5. 인터랙션 (모달, 토큰 선택)
6. 스타일링 / 폴리싱
