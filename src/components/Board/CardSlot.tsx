import type { Card } from '../../types/game';
import { GEM_STYLE, GEM_COLORS } from '../../utils/gemColors';
import { CardArt } from '../Art/CardArt';
import { GemIcon } from '../Art/GemIcon';

interface Props {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

export function CardSlot({ card, onClick, disabled, highlight }: Props) {
  const style = GEM_STYLE[card.color];
  const costs = GEM_COLORS.filter(c => card.cost[c] > 0);

  return (
    <div
      className={`card-slot ${disabled ? 'disabled' : ''} ${highlight ? 'highlight' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <CardArt card={card} />
      <div className="card-header" style={{ backgroundColor: style.bg, color: style.text }}>
        <span className="card-points">{card.points > 0 ? card.points : ''}</span>
      </div>
      <div className={`card-cost${costs.length >= 4 ? ' card-cost--grid' : ''}`}>
        {costs.map(color => (
          <span key={color} className="cost-item">
            <GemIcon color={color} className="cost-dot" />
            <span className="cost-num">{card.cost[color]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
