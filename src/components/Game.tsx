import { useState, useCallback, useRef, useEffect } from 'react';
import type { Card, GemColor } from '../types/game';
import { canAffordCard, getTotalTokenCount, getPlayerScore } from '../game/gameLogic';
import { useGameStore } from '../store/gameStore';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { Board } from './Board/Board';
import { PlayerPanel } from './Player/PlayerPanel';
import { GEM_STYLE, TOKEN_STYLE, GEM_COLORS } from '../utils/gemColors';

type UIMode = 'idle' | 'selectingTokens' | 'cardAction' | 'discarding';

function DebugOverlay({ turnPhase, uiMode, currentPlayerIndex, myPlayerIndex, phase, isMyTurn, boardDisabled, playerNames }: {
  turnPhase: string; uiMode: string; currentPlayerIndex: number; myPlayerIndex: number;
  phase: string; isMyTurn: boolean; boardDisabled: boolean; playerNames: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="debug-overlay" onClick={() => setOpen(!open)}>
      {open ? (
        <>
          <div>phase: {phase}</div>
          <div>turnPhase: {turnPhase}</div>
          <div>uiMode: {uiMode}</div>
          <div>current: [{currentPlayerIndex}] {playerNames[currentPlayerIndex]}</div>
          <div>me: [{myPlayerIndex}] {playerNames[myPlayerIndex]}</div>
          <div>isMyTurn: {String(isMyTurn)}</div>
          <div>boardDisabled: {String(boardDisabled)}</div>
        </>
      ) : (
        <span>DBG</span>
      )}
    </div>
  );
}

interface GameProps {
  mode: 'singleplayer' | 'multiplayer';
}

function useGameActions(mode: 'singleplayer' | 'multiplayer') {
  const sp = useGameStore();
  const mp = useMultiplayerStore();

  if (mode === 'multiplayer') {
    return {
      gameState: mp.gameState,
      turnPhase: mp.turnPhase,
      error: mp.error,
      logs: mp.logs,
      myPlayerIndex: mp.myPlayerIndex ?? 0,
      turnTimer: mp.turnTimer,
      doTakeTokens: mp.doTakeTokens,
      doPurchaseCard: mp.doPurchaseCard,
      doReserveCard: mp.doReserveCard,
      doReserveCardFromDeck: mp.doReserveCardFromDeck,
      doDiscardTokens: mp.doDiscardTokens,
      undoAction: mp.undoAction,
      confirmTurn: mp.confirmTurn,
      clearError: mp.clearError,
      resetGame: mp.resetGame,
      startGame: undefined as undefined | ((name: string) => void),
    };
  }

  return {
    gameState: sp.gameState,
    turnPhase: sp.turnPhase,
    error: sp.error,
    logs: sp.logs,
    myPlayerIndex: 0,
    turnTimer: null as { remainingSeconds: number; playerName: string; playerIndex: number } | null,
    doTakeTokens: sp.doTakeTokens,
    doPurchaseCard: sp.doPurchaseCard,
    doReserveCard: sp.doReserveCard,
    doReserveCardFromDeck: sp.doReserveCardFromDeck,
    doDiscardTokens: sp.doDiscardTokens,
    undoAction: sp.undoAction,
    confirmTurn: sp.confirmTurn,
    clearError: sp.clearError,
    resetGame: sp.resetGame,
    startGame: sp.startGame,
  };
}

export function Game({ mode }: GameProps) {
  const {
    gameState, turnPhase, error, myPlayerIndex, turnTimer,
    doTakeTokens, doPurchaseCard, doReserveCard, doReserveCardFromDeck,
    doDiscardTokens, undoAction, confirmTurn, clearError,
    startGame, resetGame,
  } = useGameActions(mode);

  const [uiMode, setUIMode] = useState<UIMode>('idle');
  const [selectedTokens, setSelectedTokens] = useState<Partial<Record<GemColor, number>>>({});
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardSource, setCardSource] = useState<'visible' | 'reserved'>('visible');
  const [discardSelection, setDiscardSelection] = useState<Partial<Record<GemColor | 'gold', number>>>({});

  // turnPhase가 idle일 때의 예약 카드 ID를 기억 (덱 예약 치팅 방지)
  const confirmedReservedIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (gameState && turnPhase === 'idle') {
      confirmedReservedIds.current = new Set(
        gameState.players[myPlayerIndex]?.reservedCards.map(c => c.id) ?? []
      );
    }
  }, [gameState, turnPhase, myPlayerIndex]);

  if (!gameState) return null;

  const myPlayer = gameState.players[myPlayerIndex];
  // 확정 전 새로 추가된 예약 카드 ID (뒷면으로 표시해야 함)
  const pendingReservedIds = turnPhase !== 'idle'
    ? new Set(myPlayer.reservedCards.filter(c => !confirmedReservedIds.current.has(c.id)).map(c => c.id))
    : new Set<string>();
  const opponents = gameState.players.filter((_, i) => i !== myPlayerIndex);
  const isMyTurn = gameState.currentPlayerIndex === myPlayerIndex && gameState.phase === 'playing';
  const boardDisabled = !isMyTurn || turnPhase !== 'idle';
  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];

  // ─── 토큰 선택 ──────────────────────

  const handleTokenClick = useCallback((color: GemColor) => {
    if (!isMyTurn || turnPhase !== 'idle') return;

    setUIMode('selectingTokens');
    setSelectedTokens(prev => {
      const current = { ...prev };
      const currentCount = current[color] ?? 0;
      const totalSelected = Object.values(current).reduce((s, n) => s + (n ?? 0), 0);
      const colorsUsed = Object.entries(current).filter(([, n]) => (n ?? 0) > 0).map(([c]) => c);

      if (currentCount === 1 && colorsUsed.length === 1 && gameState.tokens[color] >= 4) {
        return { [color]: 2 };
      }

      if (currentCount > 0) {
        delete current[color];
        if (Object.values(current).every(n => (n ?? 0) === 0)) {
          setUIMode('idle');
        }
        return current;
      }

      if (colorsUsed.length === 1 && (current[colorsUsed[0] as GemColor] ?? 0) === 2) {
        return { [color]: 1 };
      }

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
    // 내 예약 카드는 상대 턴에도 조회 가능
    if (source === 'reserved') {
      setSelectedCard(card);
      setCardSource(source);
      setUIMode('cardAction');
      return;
    }
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
  const playerCount = gameState.players.length;
  const layoutClass = playerCount <= 2 ? 'layout-2p' : playerCount === 3 ? 'layout-3p' : 'layout-4p';

  const isMultiSeat = playerCount >= 3;

  const opponentPanel = (player: typeof opponents[number]) => (
    <PlayerPanel
      key={player.id}
      player={player}
      isOpponent
      compact={isMultiSeat}
      isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(player)}
    />
  );

  const boardElement = (
    <Board
      gameState={gameState}
      onCardClick={(card) => handleCardClick(card, 'visible')}
      onDeckClick={handleDeckReserve}
      selectedTokens={uiMode === 'selectingTokens' ? selectedTokens : undefined}
      onTokenClick={handleTokenClick}
      disabled={boardDisabled}
    />
  );

  const myPanel = (
    <PlayerPanel
      player={myPlayer}
      compact={isMultiSeat}
      isCurrentTurn={gameState.currentPlayerIndex === myPlayerIndex}
      onReservedCardClick={(card) => handleCardClick(card, 'reserved')}
      hiddenCardIds={pendingReservedIds}
    />
  );

  return (
    <div className={`game ${layoutClass}`}>
      {/* 2인: 기존 레이아웃 */}
      {playerCount <= 2 && (
        <>
          {opponents[0] && opponentPanel(opponents[0])}
          {boardElement}
          {myPanel}
        </>
      )}

      {/* 3인: 상단 + 좌측 + 보드 + 하단 */}
      {playerCount === 3 && (
        <>
          <div className="seat-top">{opponents[0] && opponentPanel(opponents[0])}</div>
          <div className="seat-left">{opponents[1] && opponentPanel(opponents[1])}</div>
          <div className="seat-center">{boardElement}</div>
          <div className="seat-bottom">{myPanel}</div>
        </>
      )}

      {/* 4인: 상단 + 좌측 + 보드 + 우측 + 하단 */}
      {playerCount === 4 && (
        <>
          <div className="seat-top">{opponents[0] && opponentPanel(opponents[0])}</div>
          <div className="seat-left">{opponents[1] && opponentPanel(opponents[1])}</div>
          <div className="seat-center">{boardElement}</div>
          <div className="seat-right">{opponents[2] && opponentPanel(opponents[2])}</div>
          <div className="seat-bottom">{myPanel}</div>
        </>
      )}

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
              {isMyTurn && turnPhase === 'idle' && (
                <>
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
                </>
              )}
              <button className="btn btn-cancel" onClick={handleCloseCardAction}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 토큰 버리기 모달 (내 턴일 때만) */}
      {turnPhase === 'discarding' && isMyTurn && (
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

      {/* 턴 확정 / 취소 바 (내 턴일 때만) */}
      {turnPhase === 'action' && isMyTurn && (
        <div className="action-bar turn-bar">
          <button className="btn btn-confirm" onClick={handleConfirmTurn}>턴 확정</button>
          <button className="btn btn-cancel" onClick={handleUndo}>취소 (되돌리기)</button>
        </div>
      )}

      {/* 상대 턴 표시 + 카운트다운 */}
      {!isMyTurn && gameState.phase === 'playing' && (
        <div className={`action-bar ai-bar ${turnTimer ? 'has-timer' : ''}`}>
          {mode === 'singleplayer'
            ? 'AI가 생각 중...'
            : turnTimer
              ? <><span className="turn-timer-count">{turnTimer.remainingSeconds}초</span> {turnTimer.playerName}의 턴 — 연결 끊김, 자동 스킵 대기</>
              : `${currentTurnPlayer.name}의 턴 — 대기 중...`
          }
        </div>
      )}

      {/* 게임 종료 */}
      {/* 디버그 오버레이 */}
      {mode === 'multiplayer' && (
        <DebugOverlay
          turnPhase={turnPhase}
          uiMode={uiMode}
          currentPlayerIndex={gameState.currentPlayerIndex}
          myPlayerIndex={myPlayerIndex}
          phase={gameState.phase}
          isMyTurn={isMyTurn}
          boardDisabled={boardDisabled}
          playerNames={gameState.players.map(p => p.name)}
        />
      )}

      {gameState.phase === 'ended' && gameState.winner && (
        <div className="modal-overlay">
          <div className="modal game-over">
            <div className="modal-title">게임 종료!</div>
            <div className="winner-name">
              {gameState.winner.id === myPlayer.id
                ? '승리!'
                : `${gameState.winner.name} 승리`
              }
            </div>
            <div className="winner-score">
              최종 점수: {gameState.players.map(p =>
                `${p.name} ${getPlayerScore(p)}점`
              ).join(' / ')}
            </div>
            <div className="modal-actions">
              {mode === 'singleplayer' && startGame && (
                <button className="btn btn-confirm" onClick={() => startGame(myPlayer.name)}>
                  다시하기
                </button>
              )}
              <button className="btn btn-cancel" onClick={resetGame}>
                {mode === 'singleplayer' ? '처음으로' : '나가기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
