import type { Player, Card, GemColor } from '../../types/game';
import { GEM_STYLE, TOKEN_STYLE, GEM_COLORS } from '../../utils/gemColors';
import { getPlayerBonuses, getPlayerScore, getTotalTokenCount } from '../../game/gameLogic';

const COLOR_ORDER: Record<GemColor, number> = Object.fromEntries(
  GEM_COLORS.map((c, i) => [c, i])
) as Record<GemColor, number>;

function sortByColor<T extends { color: GemColor }>(items: T[]): T[] {
  return [...items].sort((a, b) => COLOR_ORDER[a.color] - COLOR_ORDER[b.color]);
}

interface Props {
  player: Player;
  isOpponent?: boolean;
  isCurrentTurn?: boolean;
  compact?: boolean;
  onReservedCardClick?: (card: Card) => void;
}

export function PlayerPanel({ player, isOpponent, isCurrentTurn, compact, onReservedCardClick }: Props) {
  const score = getPlayerScore(player);
  const bonuses = getPlayerBonuses(player);
  const totalTokens = getTotalTokenCount(player);

  return (
    <div className={`player-panel ${isOpponent ? 'opponent' : 'self'} ${isCurrentTurn ? 'current-turn' : ''} ${compact ? 'compact' : ''}`}>
      <div className="player-header">
        <span className="player-name">{player.name}</span>
        <span className="player-score">{score}점</span>
      </div>

      {/* 보유 토큰 + 보너스 (색상별 세로 정렬) */}
      <div className="player-token-grid">
        {GEM_COLORS.map(color => (
          <div key={color} className="token-column">
            <span className="token-mini" style={{ backgroundColor: TOKEN_STYLE[color].bg, color: TOKEN_STYLE[color].text }}>
              {player.tokens[color]}
            </span>
            {bonuses[color] > 0 && (
              <span className="bonus-badge" style={{ backgroundColor: GEM_STYLE[color].bg, color: GEM_STYLE[color].text }}>
                {bonuses[color]}
              </span>
            )}
          </div>
        ))}
        {player.tokens.gold > 0 && (
          <div className="token-column">
            <span className="token-mini" style={{ backgroundColor: TOKEN_STYLE.gold.bg, color: TOKEN_STYLE.gold.text }}>
              {player.tokens.gold}
            </span>
          </div>
        )}
        <span className={`token-total ${totalTokens >= 10 ? 'at-limit' : ''}`}>
          {totalTokens}/10
        </span>
      </div>

      {/* 구매한 카드 목록 */}
      {player.cards.length > 0 && (
        <div className="owned-cards">
          {sortByColor(player.cards).map(card => (
            <div
              key={card.id}
              className="owned-card-mini"
              style={{ backgroundColor: GEM_STYLE[card.color].bg, color: GEM_STYLE[card.color].text }}
            >
              {card.points > 0 ? card.points : ''}
            </div>
          ))}
        </div>
      )}

      {/* 예약 카드 */}
      {player.reservedCards.length > 0 && (
        <div className="player-reserved">
          <span className="section-label">예약 ({player.reservedCards.length}/3)</span>
          <div className="reserved-cards">
            {sortByColor(player.reservedCards).map(card => (
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
