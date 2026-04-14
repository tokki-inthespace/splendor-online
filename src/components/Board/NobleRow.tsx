import type { Noble } from '../../types/game';
import { GEM_COLORS } from '../../utils/gemColors';
import { NobleArt } from '../Art/NobleArt';

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
            <NobleArt noble={noble} />
            <span className="noble-points">{noble.points}</span>
            <div className="noble-req">
              {reqs.map(color => (
                <span key={color} className="noble-req-item">
                  <img
                    src={`/illustrations/noble-requirements/${color}.webp`}
                    alt=""
                    className="noble-card-icon"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="noble-num">{noble.requirement[color]}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
