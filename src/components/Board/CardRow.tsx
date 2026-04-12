import type { Card } from '../../types/game';
import { CardSlot } from './CardSlot';

interface Props {
  level: 1 | 2 | 3;
  cards: (Card | null)[];
  deckCount: number;
  onCardClick?: (card: Card) => void;
  onDeckClick?: () => void;
  disabled?: boolean;
}

const LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };
const LEVEL_COLOR: Record<1 | 2 | 3, string> = { 1: '#4CAF50', 2: '#FF9800', 3: '#2196F3' };

export function CardRow({ level, cards, deckCount, onCardClick, onDeckClick, disabled }: Props) {
  return (
    <div className="card-row">
      <div
        className={`deck-slot ${deckCount === 0 ? 'empty' : ''}`}
        style={{ borderColor: LEVEL_COLOR[level] }}
        onClick={deckCount > 0 && !disabled ? onDeckClick : undefined}
      >
        <span className="deck-level">{LEVEL_LABEL[level]}</span>
        <span className="deck-count">{deckCount}</span>
      </div>
      {cards.map((card, i) =>
        card ? (
          <CardSlot
            key={card.id}
            card={card}
            onClick={() => onCardClick?.(card)}
            disabled={disabled}
          />
        ) : (
          <div key={`empty-${i}`} className="card-slot empty" />
        )
      )}
      {/* 빈 슬롯 채우기 (항상 4칸 유지) */}
      {Array.from({ length: 4 - cards.length }).map((_, i) => (
        <div key={`tail-${i}`} className="card-slot empty" />
      ))}
    </div>
  );
}
