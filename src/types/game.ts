// 보석 색상 (토큰/카드 비용에 사용)
export type GemColor = 'white' | 'blue' | 'green' | 'red' | 'black';

// 조커 토큰(골드)을 포함한 전체 토큰 종류
export type TokenColor = GemColor | 'gold';

// 보석별 수량을 담는 객체 (예: { white: 2, blue: 0, green: 1, red: 0, black: 1 })
export type GemMap = Record<GemColor, number>;

// 토큰 수량을 담는 객체 (골드 포함)
export type TokenMap = Record<TokenColor, number>;

// 개발 카드 (1/2/3 레벨)
export interface Card {
  id: string;
  level: 1 | 2 | 3;       // 카드 레벨
  color: GemColor;          // 이 카드가 주는 보석 색상
  points: number;           // 승점
  cost: GemMap;             // 구매 비용
}

// 귀족 타일
export interface Noble {
  id: string;
  points: number;           // 승점 (항상 3점)
  requirement: GemMap;      // 필요한 카드 보유량
}

// 플레이어 상태
export interface Player {
  id: string;
  name: string;
  tokens: TokenMap;         // 보유 토큰
  cards: Card[];            // 구매한 카드
  reservedCards: Card[];    // 예약한 카드 (최대 3장)
  nobles: Noble[];          // 획득한 귀족
}

// 게임 보드 상태
export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Record<1 | 2 | 3, Card[]>;        // 레벨별 남은 덱
  visibleCards: Record<1 | 2 | 3, (Card | null)[]>; // 레벨별 공개된 카드 (각 4장, null = 빈 슬롯)
  nobles: Noble[];                          // 남은 귀족 타일
  tokens: TokenMap;                         // 공용 토큰 풀
  winner: Player | null;
  phase: 'setup' | 'playing' | 'ended';
}

// 빈 GemMap 생성 헬퍼
export const emptyGemMap = (): GemMap => ({
  white: 0, blue: 0, green: 0, red: 0, black: 0,
});

// 빈 TokenMap 생성 헬퍼
export const emptyTokenMap = (): TokenMap => ({
  white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0,
});
