import type { GemColor, TokenMap } from '../../types/game';
import { TOKEN_STYLE, GEM_COLORS } from '../../utils/gemColors';

interface Props {
  tokens: TokenMap;
  selectedTokens?: Partial<Record<GemColor, number>>;
  onTokenClick?: (color: GemColor) => void;
  disabled?: boolean;
}

export function TokenPool({ tokens, selectedTokens, onTokenClick, disabled }: Props) {
  return (
    <div className="token-pool">
      {GEM_COLORS.map(color => {
        const selected = selectedTokens?.[color] ?? 0;
        const style = TOKEN_STYLE[color];
        return (
          <div
            key={color}
            className={`token-stack ${selected > 0 ? 'selected' : ''} ${disabled || tokens[color] === 0 ? 'disabled' : ''}`}
            onClick={!disabled && tokens[color] > 0 ? () => onTokenClick?.(color) : undefined}
          >
            <div className="token-circle" style={{ backgroundColor: style.bg, color: style.text }}>
              {tokens[color]}
            </div>
            {selected > 0 && <div className="token-selected-badge">+{selected}</div>}
          </div>
        );
      })}
      {/* 골드 토큰 (클릭 불가, 표시만) */}
      <div className="token-stack gold disabled">
        <div className="token-circle" style={{ backgroundColor: TOKEN_STYLE.gold.bg, color: TOKEN_STYLE.gold.text }}>
          {tokens.gold}
        </div>
        <div className="token-label">gold</div>
      </div>
    </div>
  );
}
