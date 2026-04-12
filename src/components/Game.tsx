import { useState, useCallback } from 'react';
import type { Card, GemColor } from '../types/game';
import { canAffordCard, getTotalTokenCount } from '../game/gameLogic';
import { useGameStore } from '../store/gameStore';
import { Board } from './Board/Board';
import { PlayerPanel } from './Player/PlayerPanel';
import { GEM_STYLE, TOKEN_STYLE, GEM_COLORS } from '../utils/gemColors';

type UIMode = 'idle' | 'selectingTokens' | 'cardAction' | 'discarding';

export function Game() {
  const {
    gameState, turnPhase, error,
    doTakeTokens, doPurchaseCard, doReserveCard, doReserveCardFromDeck,
    doDiscardTokens, undoAction, confirmTurn, clearError,
    startGame, resetGame,
  } = useGameStore();

  const [uiMode, setUIMode] = useState<UIMode>('idle');
  const [selectedTokens, setSelectedTokens] = useState<Partial<Record<GemColor, number>>>({});
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardSource, setCardSource] = useState<'visible' | 'reserved'>('visible');
  const [discardSelection, setDiscardSelection] = useState<Partial<Record<GemColor | 'gold', number>>>({});

  if (!gameState) return null;

  const myPlayer = gameState.players[0];
  const aiPlayer = gameState.players[1];
  const isMyTurn = gameState.currentPlayerIndex === 0 && gameState.phase === 'playing';
  const boardDisabled = !isMyTurn || turnPhase !== 'idle';

  // ─── 토큰 선택 ──────────────────────

  const handleTokenClick = useCallback((color: GemColor) => {
    if (!isMyTurn || turnPhase !== 'idle') return;

    setUIMode('selectingTokens');
    setSelectedTokens(prev => {
      const current = { ...prev };
      const currentCount = current[color] ?? 0;
      const totalSelected = Object.values(current).reduce((s, n) => s + (n ?? 0), 0);
      const colorsUsed = Object.entries(current).filter(([, n]) => (n ?? 0) > 0).map(([c]) => c);

      // 같은 색 두 번째 클릭 → 2개로 (풀에 4개 이상일 때)
      if (currentCount === 1 && colorsUsed.length === 1 && gameState.tokens[color] >= 4) {
        return { [color]: 2 };
      }

      // 이미 선택된 색 다시 클릭 → 해제
      if (currentCount > 0) {
        delete current[color];
        if (Object.values(current).every(n => (n ?? 0) === 0)) {
          setUIMode('idle');
        }
        return current;
      }

      // 이미 같은 색 2개 선택 중이면 리셋
      if (colorsUsed.length === 1 && (current[colorsUsed[0] as GemColor] ?? 0) === 2) {
        return { [color]: 1 };
      }

      // 3개 이상이면 더 못 넣음
      if (totalSelected >= 3) return current;

      return { ...current, [color]: 1 };
    });
  }, [isMyTurn, turnPhase, gameState]);

  const handleConfirmTokens = () => {
    doTakeTokens(selectedTokens);
    setSelectedTokens({});
    setUIMode('idle');
  };

  const handleCancelTokens = () => {
    setSelectedTokens({});
    setUIMode('idle');
  };

  // ─── 카드 클릭 ──────────────────────

  const handleCardClick = (card: Card, source: 'visible' | 'reserved' = 'visible') => {
    if (!isMyTurn || turnPhase !== 'idle') return;
    setSelectedCard(card);
    setCardSource(source);
    setUIMode('cardAction');
    setSelectedTokens({});
  };

  const handleBuyCard = () => {
    if (!selectedCard) return;
    doPurchaseCard(selectedCard.id);
    setSelectedCard(null);
    setUIMode('idle');
  };

  const handleReserveCard = () => {
    if (!selectedCard) return;
    doReserveCard(selectedCard.id);
    setSelectedCard(null);
    setUIMode('idle');
  };

  const handleDeckReserve = (level: 1 | 2 | 3) => {
    if (!isMyTurn || turnPhase !== 'idle') return;
    doReserveCardFromDeck(level);
  };

  const handleCloseCardAction = () => {
    setSelectedCard(null);
    setUIMode('idle');
  };

  // ─── 토큰 버리기 ───────────────────

  const handleDiscardTokenClick = (color: GemColor | 'gold') => {
    setDiscardSelection(prev => {
      const current = { ...prev };
      const amount = current[color] ?? 0;
      const maxForColor = myPlayer.tokens[color];
      if (amount < maxForColor) {
        current[color] = amount + 1;
      }
      return current;
    });
  };

  const handleDiscardTokenRightClick = (e: React.MouseEvent, color: GemColor | 'gold') => {
    e.preventDefault();
    setDiscardSelection(prev => {
      const current = { ...prev };
      const amount = current[color] ?? 0;
      if (amount > 0) {
        current[color] = amount - 1;
        if (current[color] === 0) delete current[color];
      }
      return current;
    });
  };

  const handleConfirmDiscard = () => {
    doDiscardTokens(discardSelection);
    setDiscardSelection({});
  };

  // ─── 액션 취소 / 확정 ─────────────

  const handleUndo = () => {
    undoAction();
    setSelectedTokens({});
    setSelectedCard(null);
    setDiscardSelection({});
    setUIMode('idle');
  };

  const handleConfirmTurn = () => {
    confirmTurn();
    setUIMode('idle');
  };

  // ─── 렌더링 ─────────────────────────

  const totalDiscarding = Object.values(discardSelection).reduce((s, n) => s + (n ?? 0), 0);
  const tokensToDiscard = getTotalTokenCount(myPlayer) - 10;

  return (
    <div className="game">
      {/* AI 패널 */}
      <PlayerPanel
        player={aiPlayer}
        isOpponent
        isCurrentTurn={gameState.currentPlayerIndex === 1}
      />

      {/* 보드 */}
      <Board
        gameState={gameState}
        onCardClick={(card) => handleCardClick(card, 'visible')}
        onDeckClick={handleDeckReserve}
        selectedTokens={uiMode === 'selectingTokens' ? selectedTokens : undefined}
        onTokenClick={handleTokenClick}
        disabled={boardDisabled}
      />

      {/* 내 패널 */}
      <PlayerPanel
        player={myPlayer}
        isCurrentTurn={gameState.currentPlayerIndex === 0}
        onReservedCardClick={(card) => handleCardClick(card, 'reserved')}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="error-bar" onClick={clearError}>
          {error} <span className="error-close">✕</span>
        </div>
      )}

      {/* 토큰 선택 확인 바 */}
      {uiMode === 'selectingTokens' && turnPhase === 'idle' && (
        <div className="action-bar">
          <span className="action-label">토큰 선택:</span>
          {Object.entries(selectedTokens).filter(([, n]) => (n ?? 0) > 0).map(([color, n]) => (
            <span key={color} className="action-token" style={{ backgroundColor: GEM_STYLE[color as GemColor].bg, color: GEM_STYLE[color as GemColor].text }}>
              {n}
            </span>
          ))}
          <button className="btn btn-confirm" onClick={handleConfirmTokens}>가져오기</button>
          <button className="btn btn-cancel" onClick={handleCancelTokens}>취소</button>
        </div>
      )}

      {/* 카드 액션 모달 */}
      {uiMode === 'cardAction' && selectedCard && (
        <div className="modal-overlay" onClick={handleCloseCardAction}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-card">
              <div className="modal-card-header" style={{ backgroundColor: GEM_STYLE[selectedCard.color].bg, color: GEM_STYLE[selectedCard.color].text }}>
                {selectedCard.points > 0 ? `${selectedCard.points}점` : '0점'} — {selectedCard.color} 카드
              </div>
              <div className="modal-card-cost">
                {GEM_COLORS.filter(c => selectedCard.cost[c] > 0).map(color => (
                  <span key={color} className="cost-item">
                    <span className="cost-dot" style={{ backgroundColor: GEM_STYLE[color].bg }} />
                    <span className="cost-num">{selectedCard.cost[color]}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-confirm"
                onClick={handleBuyCard}
                disabled={!canAffordCard(myPlayer, selectedCard)}
              >
                구매{!canAffordCard(myPlayer, selectedCard) ? ' (불가)' : ''}
              </button>
              {cardSource === 'visible' && myPlayer.reservedCards.length < 3 && (
                <button className="btn btn-reserve" onClick={handleReserveCard}>예약</button>
              )}
              <button className="btn btn-cancel" onClick={handleCloseCardAction}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 토큰 버리기 모달 */}
      {turnPhase === 'discarding' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">토큰 버리기 ({tokensToDiscard}개 선택)</div>
            <div className="discard-tokens">
              {([...GEM_COLORS, 'gold'] as const).map(color => {
                if (myPlayer.tokens[color] === 0) return null;
                const selected = discardSelection[color] ?? 0;
                return (
                  <div
                    key={color}
                    className="discard-item"
                    onClick={() => handleDiscardTokenClick(color)}
                    onContextMenu={(e) => handleDiscardTokenRightClick(e, color)}
                  >
                    <span className="token-circle small" style={{ backgroundColor: TOKEN_STYLE[color].bg, color: TOKEN_STYLE[color].text }}>
                      {myPlayer.tokens[color]}
                    </span>
                    {selected > 0 && <span className="discard-badge">-{selected}</span>}
                  </div>
                );
              })}
            </div>
            <p className="discard-hint">클릭: 선택 / 우클릭: 취소</p>
            <div className="modal-actions">
              <button
                className="btn btn-confirm"
                onClick={handleConfirmDiscard}
                disabled={totalDiscarding !== tokensToDiscard}
              >
                확인 ({totalDiscarding}/{tokensToDiscard})
              </button>
              <button className="btn btn-cancel" onClick={() => setDiscardSelection({})}>
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 턴 확정 / 취소 바 */}
      {turnPhase === 'action' && (
        <div className="action-bar turn-bar">
          <button className="btn btn-confirm" onClick={handleConfirmTurn}>턴 확정</button>
          <button className="btn btn-cancel" onClick={handleUndo}>취소 (되돌리기)</button>
        </div>
      )}

      {/* AI 턴 표시 */}
      {isMyTurn === false && gameState.phase === 'playing' && (
        <div className="action-bar ai-bar">AI가 생각 중...</div>
      )}

      {/* 게임 종료 */}
      {gameState.phase === 'ended' && gameState.winner && (
        <div className="modal-overlay">
          <div className="modal game-over">
            <div className="modal-title">게임 종료!</div>
            <div className="winner-name">
              {gameState.winner.id === 'player-0' ? '승리!' : 'AI 승리...'}
            </div>
            <div className="winner-score">
              최종 점수: {gameState.players.map(p =>
                `${p.name} ${p.cards.reduce((s, c) => s + c.points, 0) + p.nobles.reduce((s, n) => s + n.points, 0)}점`
              ).join(' / ')}
            </div>
            <div className="modal-actions">
              <button className="btn btn-confirm" onClick={() => startGame(myPlayer.name)}>
                다시하기
              </button>
              <button className="btn btn-cancel" onClick={resetGame}>
                처음으로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
