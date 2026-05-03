import type { Player, Card, GemColor } from '../../types/game';
import type { EmoteId } from '../../protocol';
import { EMOTE_MAP } from '../../protocol';
import { GEM_STYLE, TOKEN_STYLE, GEM_COLORS, getTokenCountShadow } from '../../utils/gemColors';
import { GemIcon } from '../Art/GemIcon';
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
  hiddenCardIds?: Set<string>;
  activeEmote?: EmoteId | null;
  /** 이모트 말풍선 위치: 'top' = 패널 위쪽 바깥, 'side' = 패널 우측 바깥 (상단 플레이어용) */
  emotePosition?: 'top' | 'side';
  /** true면 토큰+구매카드는 좌측 칼럼, 예약+귀족은 우측 칼럼으로 분리 (상단/하단 좌석용) */
  wideLayout?: boolean;
}

export function PlayerPanel({ player, isOpponent, isCurrentTurn, compact, onReservedCardClick, hiddenCardIds, activeEmote, emotePosition = 'top', wideLayout = false }: Props) {
  const score = getPlayerScore(player);
  const bonuses = getPlayerBonuses(player);
  const totalTokens = getTotalTokenCount(player);

  const tokenGrid = (
    <div className="player-token-grid">
      {GEM_COLORS.map(color => (
        <div key={color} className="token-column">
          <span className="token-mini" style={{ color: TOKEN_STYLE[color].text, textShadow: getTokenCountShadow(color) }}>
            <GemIcon color={color} />
            <span className="token-count">{player.tokens[color]}</span>
          </span>
          {bonuses[color] > 0 && (
            <span className="bonus-badge">
              <GemIcon color={color} />
              {bonuses[color]}
            </span>
          )}
        </div>
      ))}
      {player.tokens.gold > 0 && (
        <div className="token-column">
          <span className="token-mini" style={{ color: TOKEN_STYLE.gold.text, textShadow: getTokenCountShadow('gold') }}>
            <GemIcon color="gold" />
            <span className="token-count">{player.tokens.gold}</span>
          </span>
        </div>
      )}
      <span className={`token-total ${totalTokens >= 10 ? 'at-limit' : ''}`}>
        {totalTokens}/10
      </span>
    </div>
  );

  const ownedCards = player.cards.length > 0 ? (
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
  ) : null;

  const reserved = player.reservedCards.length > 0 ? (
    <div className="player-reserved">
      <span className="section-label">예약 ({player.reservedCards.length}/3)</span>
      <div className="reserved-cards">
        {sortByColor(player.reservedCards).map(card => {
          const isHidden = isOpponent || hiddenCardIds?.has(card.id);
          return isHidden ? (
            <div key={card.id} className="reserved-card-back">?</div>
          ) : (
            <div
              key={card.id}
              className="reserved-card-mini"
              style={{ borderColor: GEM_STYLE[card.color].bg }}
              onClick={() => onReservedCardClick?.(card)}
            >
              <span className="mini-points">{card.points > 0 ? card.points : ''}</span>
              <GemIcon color={card.color} className="mini-gem" />
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const nobles = player.nobles.length > 0 ? (
    <div className="player-nobles">
      <span className="section-label">귀족</span>
      {player.nobles.map(noble => (
        <span key={noble.id} className="noble-mini">+{noble.points}</span>
      ))}
    </div>
  ) : null;

  return (
    <div className={`player-panel ${isOpponent ? 'opponent' : 'self'} ${isCurrentTurn ? 'current-turn' : ''} ${compact ? 'compact' : ''} ${wideLayout ? 'wide-layout' : ''}`}>
      {activeEmote && (
        <div className={`emote-bubble emote-bubble--${emotePosition}`}>{EMOTE_MAP[activeEmote]}</div>
      )}
      <div className="player-header">
        <span className="player-name">{player.name}</span>
        <span className="player-score">{score}점</span>
      </div>

      {wideLayout ? (
        <div className="panel-body panel-body--wide">
          <div className="panel-col panel-col--left">
            {tokenGrid}
            {ownedCards}
          </div>
          {(reserved || nobles) && (
            <div className="panel-col panel-col--right">
              {reserved}
              {nobles}
            </div>
          )}
        </div>
      ) : (
        <>
          {tokenGrid}
          {ownedCards}
          {reserved}
          {nobles}
        </>
      )}
    </div>
  );
}
