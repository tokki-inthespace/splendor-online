import type { Noble } from '../../types/game';
import { GEM_STYLE, GEM_COLORS } from '../../utils/gemColors';

interface Props {
  nobles: Noble[];
}

export function NobleRow({ nobles }: Props) {
  return (
    <div className="noble-row">
      {nobles.map(noble => {
        const reqs = GEM_COLORS.filter(c => noble.requirement[c] > 0);
        return (
          <div key={noble.id} className="noble-tile">
            <span className="noble-points">{noble.points}</span>
            <div className="noble-req">
              {reqs.map(color => (
                <span key={color} className="req-item">
                  <span className="cost-dot" style={{ backgroundColor: GEM_STYLE[color].bg }} />
                  <span className="cost-num">{noble.requirement[color]}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
