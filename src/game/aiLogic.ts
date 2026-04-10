import type { Card, GameState, GemColor, GemMap } from '../types/game';
import { emptyGemMap } from '../types/game';
import {
  getPlayerBonuses,
  canAffordCard,
  getTotalTokenCount,
  purchaseCard,
  takeTokens,
  discardTokens,
  endTurn,
} from './gameLogic';

const GEM_COLORS: GemColor[] = ['white', 'blue', 'green', 'red', 'black'];

/** AI가 카드를 구매하기 위해 부족한 토큰 수 계산 (적을수록 구매에 가까움) */
function getDeficit(player: { tokens: GameState['players'][0]['tokens']; cards: Card[] }, card: Card): number {
  const bonuses = getPlayerBonuses(player as GameState['players'][0]);
  let deficit = 0;
  for (const color of GEM_COLORS) {
    const need = card.cost[color] - bonuses[color] - player.tokens[color];
    if (need > 0) deficit += need;
  }
  return Math.max(0, deficit - player.tokens.gold);
}

/** 모든 공개 카드 + 예약 카드 목록 */
function getAllAvailableCards(state: GameState): Card[] {
  const player = state.players[state.currentPlayerIndex];
  return [
    ...state.visibleCards[1],
    ...state.visibleCards[2],
    ...state.visibleCards[3],
    ...player.reservedCards,
  ];
}

/** AI 턴 실행: 액션 수행 → endTurn까지 처리한 GameState 반환 */
export function executeAiTurn(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  let next = state;

  // ─── 전략 1: 구매 가능한 카드 중 최고 점수 카드 구매 ───
  const affordableCards = getAllAvailableCards(state)
    .filter(card => canAffordCard(player, card));

  if (affordableCards.length > 0) {
    // 점수 높은 순, 동점이면 비용 합계 낮은 순
    affordableCards.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const costA = GEM_COLORS.reduce((s, c) => s + a.cost[c], 0);
      const costB = GEM_COLORS.reduce((s, c) => s + b.cost[c], 0);
      return costA - costB;
    });
    next = purchaseCard(state, affordableCards[0].id);
    return endTurn(next);
  }

  // ─── 전략 2: 가장 가까운 카드 기준으로 토큰 수집 ────────
  const allCards = getAllAvailableCards(state);
  if (allCards.length > 0) {
    // deficit이 적은 순으로 정렬 (곧 살 수 있는 카드 우선)
    const targets = allCards
      .map(card => ({ card, deficit: getDeficit(player, card) }))
      .sort((a, b) => a.deficit - b.deficit);

    const target = targets[0].card;
    const bonuses = getPlayerBonuses(player);

    // 타겟 카드에 부족한 색상 파악
    const neededColors: GemColor[] = [];
    for (const color of GEM_COLORS) {
      const need = target.cost[color] - bonuses[color] - player.tokens[color];
      if (need > 0 && state.tokens[color] > 0) {
        neededColors.push(color);
      }
    }

    const tokenSelection = pickTokens(neededColors, state);

    if (tokenSelection) {
      try {
        next = takeTokens(state, tokenSelection);
        // 10개 초과 시 자동 버리기
        if (getTotalTokenCount(next.players[next.currentPlayerIndex]) > 10) {
          next = autoDiscard(next);
        }
        return endTurn(next);
      } catch {
        // 토큰 선택 실패 시 아래 폴백으로
      }
    }
  }

  // ─── 폴백: 가용 토큰 중 아무거나 가져가기 ─────────────
  const availableColors = GEM_COLORS.filter(c => state.tokens[c] > 0);
  const fallback = pickTokens(availableColors, state);

  if (fallback) {
    try {
      next = takeTokens(state, fallback);
      if (getTotalTokenCount(next.players[next.currentPlayerIndex]) > 10) {
        next = autoDiscard(next);
      }
      return endTurn(next);
    } catch {
      // 토큰도 못 가져가면 그냥 턴 넘김
    }
  }

  return endTurn(state);
}

/** 토큰 선택: 다른 색 최대 3개 or 같은 색 2개 */
function pickTokens(
  preferredColors: GemColor[],
  state: GameState,
): Partial<GemMap> | null {
  const available = GEM_COLORS.filter(c => state.tokens[c] > 0);
  if (available.length === 0) return null;

  // 선호 색상 중 풀에 남아있는 것만
  const preferred = preferredColors.filter(c => state.tokens[c] > 0);

  // 선호 색상으로 시작, 부족하면 다른 색으로 채워서 최대 3개
  if (available.length >= 3 || preferred.length >= 1) {
    const picked: GemColor[] = [...preferred.slice(0, 3)];
    if (picked.length < 3) {
      for (const c of available) {
        if (picked.length >= 3) break;
        if (!picked.includes(c)) picked.push(c);
      }
    }
    if (picked.length >= 2) {
      const selection: Partial<GemMap> = {};
      for (const c of picked.slice(0, 3)) selection[c] = 1;
      return selection;
    }
  }

  // 같은 색 2개 시도 (풀에 4개 이상)
  const prefer2 = preferred.find(c => state.tokens[c] >= 4)
    ?? available.find(c => state.tokens[c] >= 4);
  if (prefer2) {
    return { [prefer2]: 2 };
  }

  // 다른 색 2개 이상 있으면 가져가기
  if (available.length >= 2) {
    const selection: Partial<GemMap> = {};
    for (const c of available.slice(0, 2)) selection[c] = 1;
    return selection;
  }

  // 최후의 수단: 1개만
  return { [available[0]]: 1 };
}

/** 10개 초과 시 자동으로 가장 많이 가진 색부터 버리기 */
function autoDiscard(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const excess = getTotalTokenCount(player) - 10;
  if (excess <= 0) return state;

  const toDiscard: Partial<Record<GemColor | 'gold', number>> = {};
  let remaining = excess;

  // 가장 많이 가진 토큰부터 버리기
  const colorsByCount = ([...GEM_COLORS, 'gold'] as const)
    .filter(c => player.tokens[c] > 0)
    .sort((a, b) => player.tokens[b] - player.tokens[a]);

  for (const color of colorsByCount) {
    if (remaining <= 0) break;
    const canDiscard = Math.min(remaining, player.tokens[color]);
    if (canDiscard > 0) {
      toDiscard[color] = canDiscard;
      remaining -= canDiscard;
    }
  }

  return discardTokens(state, toDiscard);
}
