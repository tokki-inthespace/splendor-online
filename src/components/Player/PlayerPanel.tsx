import type { Player, Card } from '../../types/game';
import { GEM_STYLE, TOKEN_STYLE, GEM_COLORS } from '../../utils/gemColors';
import { getPlayerBonuses, getPlayerScore } from '../../game/gameLogic';

interface Props {
  player: Player;
  isOpponent?: boolean;
  isCurrentTurn?: boolean;
  onReservedCardClick?: (card: Card) => void;
}

export function PlayerPanel({ player, isOpponent, isCurrentTurn, onReservedCardClick }: Props) {
  const bonuses = getPlayerBonuses(player);
  const score = getPlayerScore(player);

  return (
    <div className={`player-panel ${isOpponent ? 'opponent' : 'self'} ${isCurrentTurn ? 'current-turn' : ''}`}>
      <div className="player-header">
        <span className="player-name">{player.name}</span>
        <span className="player-score">{score}점</span>
      </div>

      {/* 보유 토큰 */}
      <div className="player-tokens">
        {GEM_COLORS.map(color => (
          <span key={color} className="player-token-item">
            <span className="token-mini" style={{ backgroundColor: TOKEN_STYLE[color].bg, color: TOKEN_STYLE[color].text }}>
              {player.tokens[color]}
            </span>
          </span>
        ))}
        {player.tokens.gold > 0 && (
          <span className="player-token-item">
            <span className="token-mini" style={{ backgroundColor: TOKEN_STYLE.gold.bg, color: TOKEN_STYLE.gold.text }}>
              {player.tokens.gold}
            </span>
          </span>
        )}
      </div>

      {/* 카드 보너스 */}
      <div className="player-bonuses">
        {GEM_COLORS.map(color => (
          bonuses[color] > 0 ? (
            <span key={color} className="bonus-item">
              <span className="bonus-dot" style={{ backgroundColor: GEM_STYLE[color].bg }} />
              <span className="bonus-num">{bonuses[color]}</span>
            </span>
          ) : null
        ))}
        {GEM_COLORS.every(c => bonuses[c] === 0) && (
          <span className="no-bonus">보너스 없음</span>
        )}
      </div>

      {/* 예약 카드 */}
      {player.reservedCards.length > 0 && (
        <div className="player-reserved">
          <span className="section-label">예약 ({player.reservedCards.length}/3)</span>
          <div className="reserved-cards">
            {player.reservedCards.map(card => (
              isOpponent ? (
                <div key={card.id} className="reserved-card-back">?</div>
              ) : (
                <div
                  key={card.id}
                  className="reserved-card-mini"
                  style={{ borderColor: GEM_STYLE[card.color].bg }}
                  onClick={() => onReservedCardClick?.(card)}
                >
                  <span className="mini-points">{card.points > 0 ? card.points : ''}</span>
                  <span className="mini-gem" style={{ backgroundColor: GEM_STYLE[card.color].bg }}>●</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* 획득 귀족 */}
      {player.nobles.length > 0 && (
        <div className="player-nobles">
          <span className="section-label">귀족</span>
          {player.nobles.map(noble => (
            <span key={noble.id} className="noble-mini">+{noble.points}</span>
          ))}
        </div>
      )}
    </div>
  );
}
