import type { Card, GameState, GemColor } from '../../types/game';
import { CardRow } from './CardRow';
import { NobleRow } from './NobleRow';
import { TokenPool } from './TokenPool';

interface Props {
  gameState: GameState;
  onCardClick?: (card: Card) => void;
  onDeckClick?: (level: 1 | 2 | 3) => void;
  selectedTokens?: Partial<Record<GemColor, number>>;
  onTokenClick?: (color: GemColor) => void;
  disabled?: boolean;
}

export function Board({ gameState, onCardClick, onDeckClick, selectedTokens, onTokenClick, disabled }: Props) {
  return (
    <div className="board">
      <NobleRow nobles={gameState.nobles} />
      {([3, 2, 1] as const).map(level => (
        <CardRow
          key={level}
          level={level}
          cards={gameState.visibleCards[level]}
          deckCount={gameState.deck[level].length}
          onCardClick={onCardClick}
          onDeckClick={() => onDeckClick?.(level)}
          disabled={disabled}
        />
      ))}
      <TokenPool
        tokens={gameState.tokens}
        selectedTokens={selectedTokens}
        onTokenClick={onTokenClick}
        disabled={disabled}
      />
    </div>
  );
}
