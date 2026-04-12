import type { Card, Player, GameState, GemColor, GemMap, TokenMap, TokenColor } from '../types/game';
import { emptyGemMap, emptyTokenMap } from '../types/game';
import { ALL_CARDS, ALL_NOBLES } from './cardData';

const GEM_COLORS: GemColor[] = ['white', 'blue', 'green', 'red', 'black'];

// ─── 유틸리티 ──────────────────────────────────────────

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── 플레이어 헬퍼 ────────────────────────────────────

/** 플레이어가 보유한 카드의 보석 보너스 합계 */
export function getPlayerBonuses(player: Player): GemMap {
  const bonuses = emptyGemMap();
  for (const card of player.cards) {
    bonuses[card.color]++;
  }
  return bonuses;
}

/** 플레이어 총 승점 (카드 + 귀족) */
export function getPlayerScore(player: Player): number {
  const cardPoints = player.cards.reduce((sum, c) => sum + c.points, 0);
  const noblePoints = player.nobles.reduce((sum, n) => sum + n.points, 0);
  return cardPoints + noblePoints;
}

/** 플레이어 보유 토큰 총 개수 */
export function getTotalTokenCount(player: Player): number {
  return (Object.keys(player.tokens) as TokenColor[]).reduce(
    (sum, color) => sum + player.tokens[color], 0,
  );
}

/** 플레이어가 해당 카드를 구매할 수 있는지 확인 */
export function canAffordCard(player: Player, card: Card): boolean {
  const bonuses = getPlayerBonuses(player);
  let goldNeeded = 0;
  for (const color of GEM_COLORS) {
    const deficit = card.cost[color] - bonuses[color] - player.tokens[color];
    if (deficit > 0) goldNeeded += deficit;
  }
  return goldNeeded <= player.tokens.gold;
}

/** 현재 플레이어가 토큰을 버려야 하는지 (10개 초과) */
export function needsDiscard(state: GameState): boolean {
  const player = state.players[state.currentPlayerIndex];
  return getTotalTokenCount(player) > 10;
}

// ─── 내부 헬퍼 ─────────────────────────────────────────

/** 카드 구매 시 지불할 토큰 계산 (보너스 차감 → 보유 토큰 → 골드 순) */
function calculatePayment(player: Player, card: Card): TokenMap {
  const bonuses = getPlayerBonuses(player);
  const payment = emptyTokenMap();
  let goldNeeded = 0;

  for (const color of GEM_COLORS) {
    const afterBonus = Math.max(0, card.cost[color] - bonuses[color]);
    const fromTokens = Math.min(afterBonus, player.tokens[color]);
    payment[color] = fromTokens;
    goldNeeded += afterBonus - fromTokens;
  }
  payment.gold = goldNeeded;
  return payment;
}

/** 현재 플레이어만 교체한 새 players 배열 반환 */
function updatePlayer(state: GameState, player: Player): Player[] {
  return state.players.map((p, i) =>
    i === state.currentPlayerIndex ? player : p,
  );
}

/** 공개 카드 한 장을 null로 교체 (위치 유지, 덱 보충은 턴 종료 시) */
function removeVisibleCard(
  visibleCards: Record<1 | 2 | 3, (Card | null)[]>,
  level: 1 | 2 | 3,
  removedCardId: string,
): Record<1 | 2 | 3, (Card | null)[]> {
  return { ...visibleCards, [level]: visibleCards[level].map(c => c?.id === removedCardId ? null : c) };
}

/** 모든 레벨의 null 슬롯을 덱에서 보충 (턴 종료 시 호출) */
export function refillVisibleCards(state: GameState): GameState {
  const newVisibleCards: Record<1 | 2 | 3, (Card | null)[]> = { 1: [...state.visibleCards[1]], 2: [...state.visibleCards[2]], 3: [...state.visibleCards[3]] };
  const newDeck: Record<1 | 2 | 3, Card[]> = { 1: [...state.deck[1]], 2: [...state.deck[2]], 3: [...state.deck[3]] };

  for (const level of [1, 2, 3] as const) {
    // null 슬롯을 덱에서 보충 (원래 위치 유지)
    for (let i = 0; i < newVisibleCards[level].length; i++) {
      if (newVisibleCards[level][i] === null && newDeck[level].length > 0) {
        newVisibleCards[level][i] = newDeck[level].shift()!;
      }
    }
    // 남은 null 제거 (덱이 비어서 채우지 못한 경우)
    newVisibleCards[level] = newVisibleCards[level].filter(c => c !== null);
  }

  return { ...state, visibleCards: newVisibleCards, deck: newDeck };
}

// ─── 게임 초기화 ──────────────────────────────────────

export function initGame(playerNames: string[]): GameState {
  const count = playerNames.length;
  if (count < 2 || count > 4) throw new Error('2~4명의 플레이어가 필요합니다');

  // 플레이어 수에 따른 토큰 개수: 2인→4, 3인→5, 4인→7
  const tokenCount = count === 2 ? 4 : count === 3 ? 5 : 7;

  // 레벨별 덱 셔플
  const level1 = shuffle(ALL_CARDS.filter(c => c.level === 1));
  const level2 = shuffle(ALL_CARDS.filter(c => c.level === 2));
  const level3 = shuffle(ALL_CARDS.filter(c => c.level === 3));

  // 플레이어 초기화
  const players: Player[] = playerNames.map((name, i) => ({
    id: `player-${i}`,
    name,
    tokens: emptyTokenMap(),
    cards: [],
    reservedCards: [],
    nobles: [],
  }));

  return {
    players,
    currentPlayerIndex: 0,
    deck: {
      1: level1.slice(4),
      2: level2.slice(4),
      3: level3.slice(4),
    },
    visibleCards: {
      1: level1.slice(0, 4),
      2: level2.slice(0, 4),
      3: level3.slice(0, 4),
    },
    nobles: shuffle(ALL_NOBLES).slice(0, count + 1),
    tokens: {
      white: tokenCount, blue: tokenCount, green: tokenCount,
      red: tokenCount, black: tokenCount, gold: 5,
    },
    winner: null,
    phase: 'playing',
  };
}

// ─── 액션: 토큰 가져오기 ─────────────────────────────

export function takeTokens(state: GameState, selected: Partial<GemMap>): GameState {
  const player = state.players[state.currentPlayerIndex];
  const colors = GEM_COLORS.filter(c => (selected[c] ?? 0) > 0);
  const totalSelected = colors.reduce((sum, c) => sum + (selected[c] ?? 0), 0);

  // 유효성 검사: 같은 색 2개 OR 다른 색 1~3개(각 1개씩)
  if (colors.length === 1 && totalSelected === 2) {
    const color = colors[0];
    if (state.tokens[color] < 4) {
      throw new Error(`${color} 토큰이 4개 미만이라 2개를 가져올 수 없습니다`);
    }
  } else if (totalSelected >= 1 && totalSelected <= 3 && totalSelected === colors.length) {
    for (const color of colors) {
      if (state.tokens[color] < 1) {
        throw new Error(`${color} 토큰이 없습니다`);
      }
    }
  } else {
    throw new Error('유효하지 않은 토큰 선택입니다');
  }

  const newPoolTokens = { ...state.tokens };
  const newPlayerTokens = { ...player.tokens };
  for (const color of colors) {
    const amount = selected[color] ?? 0;
    newPoolTokens[color] -= amount;
    newPlayerTokens[color] += amount;
  }

  return {
    ...state,
    players: updatePlayer(state, { ...player, tokens: newPlayerTokens }),
    tokens: newPoolTokens,
  };
}

// ─── 액션: 카드 구매 ─────────────────────────────────

export function purchaseCard(state: GameState, cardId: string): GameState {
  const player = state.players[state.currentPlayerIndex];

  // 공개 카드 또는 예약 카드에서 찾기
  let card: Card | undefined;
  let source: 'visible' | 'reserved' = 'visible';
  let sourceLevel: 1 | 2 | 3 = 1;

  for (const level of [1, 2, 3] as const) {
    const found = state.visibleCards[level].find(c => c?.id === cardId);
    if (found) { card = found; sourceLevel = level; break; }
  }
  if (!card) {
    const found = player.reservedCards.find(c => c.id === cardId);
    if (found) { card = found; source = 'reserved'; }
  }
  if (!card) throw new Error('카드를 찾을 수 없습니다');
  if (!canAffordCard(player, card)) throw new Error('카드를 구매할 수 없습니다');

  // 비용 지불
  const payment = calculatePayment(player, card);
  const newPlayerTokens = { ...player.tokens };
  const newPoolTokens = { ...state.tokens };
  for (const color of [...GEM_COLORS, 'gold'] as TokenColor[]) {
    newPlayerTokens[color] -= payment[color];
    newPoolTokens[color] += payment[color];
  }

  // 공개 카드에서 가져왔으면 제거 (덱 보충은 턴 종료 시)
  const newVisibleCards = source === 'visible'
    ? removeVisibleCard(state.visibleCards, sourceLevel, cardId)
    : state.visibleCards;

  const newPlayer: Player = {
    ...player,
    tokens: newPlayerTokens,
    cards: [...player.cards, card],
    reservedCards: source === 'reserved'
      ? player.reservedCards.filter(c => c.id !== cardId)
      : player.reservedCards,
  };

  return {
    ...state,
    players: updatePlayer(state, newPlayer),
    tokens: newPoolTokens,
    visibleCards: newVisibleCards,
  };
}

// ─── 액션: 카드 예약 (공개 카드) ──────────────────────

export function reserveCard(state: GameState, cardId: string): GameState {
  const player = state.players[state.currentPlayerIndex];
  if (player.reservedCards.length >= 3) throw new Error('예약 카드는 최대 3장입니다');

  let card: Card | undefined;
  let sourceLevel: 1 | 2 | 3 = 1;
  for (const level of [1, 2, 3] as const) {
    const found = state.visibleCards[level].find(c => c?.id === cardId);
    if (found) { card = found; sourceLevel = level; break; }
  }
  if (!card) throw new Error('카드를 찾을 수 없습니다');

  // 골드 토큰 지급 (있으면)
  const newPlayerTokens = { ...player.tokens };
  const newPoolTokens = { ...state.tokens };
  if (newPoolTokens.gold > 0) {
    newPlayerTokens.gold += 1;
    newPoolTokens.gold -= 1;
  }

  // 카드 제거 (덱 보충은 턴 종료 시)
  const newVisibleCards = removeVisibleCard(state.visibleCards, sourceLevel, cardId);

  return {
    ...state,
    players: updatePlayer(state, {
      ...player,
      tokens: newPlayerTokens,
      reservedCards: [...player.reservedCards, card],
    }),
    tokens: newPoolTokens,
    visibleCards: newVisibleCards,
  };
}

// ─── 액션: 카드 예약 (덱 최상단) ──────────────────────

export function reserveCardFromDeck(state: GameState, level: 1 | 2 | 3): GameState {
  const player = state.players[state.currentPlayerIndex];
  if (player.reservedCards.length >= 3) throw new Error('예약 카드는 최대 3장입니다');

  const deckCards = [...state.deck[level]];
  if (deckCards.length === 0) throw new Error(`레벨 ${level} 덱이 비어있습니다`);

  const card = deckCards.shift()!;

  const newPlayerTokens = { ...player.tokens };
  const newPoolTokens = { ...state.tokens };
  if (newPoolTokens.gold > 0) {
    newPlayerTokens.gold += 1;
    newPoolTokens.gold -= 1;
  }

  return {
    ...state,
    players: updatePlayer(state, {
      ...player,
      tokens: newPlayerTokens,
      reservedCards: [...player.reservedCards, card],
    }),
    tokens: newPoolTokens,
    deck: { ...state.deck, [level]: deckCards },
  };
}

// ─── 토큰 버리기 (10개 초과 시) ───────────────────────

export function discardTokens(state: GameState, toDiscard: Partial<TokenMap>): GameState {
  const player = state.players[state.currentPlayerIndex];
  const newPlayerTokens = { ...player.tokens };
  const newPoolTokens = { ...state.tokens };

  for (const color of [...GEM_COLORS, 'gold'] as TokenColor[]) {
    const amount = toDiscard[color] ?? 0;
    if (amount < 0 || amount > newPlayerTokens[color]) {
      throw new Error(`${color} 토큰을 ${amount}개 버릴 수 없습니다`);
    }
    newPlayerTokens[color] -= amount;
    newPoolTokens[color] += amount;
  }

  const totalAfter = (Object.keys(newPlayerTokens) as TokenColor[]).reduce(
    (sum, c) => sum + newPlayerTokens[c], 0,
  );
  if (totalAfter !== 10) throw new Error('토큰을 정확히 10개로 맞춰야 합니다');

  return {
    ...state,
    players: updatePlayer(state, { ...player, tokens: newPlayerTokens }),
    tokens: newPoolTokens,
  };
}

// ─── 자동 처리: 귀족 획득 ─────────────────────────────

export function checkNobles(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const bonuses = getPlayerBonuses(player);

  // 조건 충족하는 귀족 모두 획득
  const earned = state.nobles.filter(noble =>
    GEM_COLORS.every(color => bonuses[color] >= noble.requirement[color]),
  );
  if (earned.length === 0) return state;

  return {
    ...state,
    players: updatePlayer(state, {
      ...player,
      nobles: [...player.nobles, ...earned],
    }),
    nobles: state.nobles.filter(n => !earned.some(e => e.id === n.id)),
  };
}

// ─── 자동 처리: 승리 체크 ─────────────────────────────

export function checkWin(state: GameState): GameState {
  const hasQualifier = state.players.some(p => getPlayerScore(p) >= 15);
  if (!hasQualifier) return state;

  // 라운드가 끝나야 승자 결정 (마지막 플레이어 턴이 끝났을 때)
  if (state.currentPlayerIndex !== state.players.length - 1) return state;

  // 최고 점수자 승리, 동점이면 구매 카드가 적은 쪽
  let winner = state.players[0];
  let bestScore = getPlayerScore(winner);
  for (let i = 1; i < state.players.length; i++) {
    const p = state.players[i];
    const score = getPlayerScore(p);
    if (score > bestScore || (score === bestScore && p.cards.length < winner.cards.length)) {
      winner = p;
      bestScore = score;
    }
  }

  return { ...state, winner, phase: 'ended' };
}

// ─── 턴 종료 ──────────────────────────────────────────

export function endTurn(state: GameState): GameState {
  // 빈 슬롯 보충 (카드 구매/예약으로 빈 자리를 턴 확정 시 채움)
  let s = refillVisibleCards(state);
  s = checkNobles(s);
  s = checkWin(s);
  if (s.phase === 'ended') return s;
  return { ...s, currentPlayerIndex: (s.currentPlayerIndex + 1) % s.players.length };
}
