import { useMultiplayerStore } from '../store/multiplayerStore';

interface LobbyProps {
  onLeave: () => void;
}

export function Lobby({ onLeave }: LobbyProps) {
  const {
    roomCode, roomInfo, lobbyError, myPlayerIndex, isSpectator,
    gameState,
    setReady, startGame, leaveRoom, switchToSpectator, switchToPlayer, clearLobbyError,
  } = useMultiplayerStore();

  // 게임이 시작되면 이 컴포넌트는 더 이상 렌더링되지 않아야 함
  if (gameState) return null;

  if (!roomInfo || !roomCode) {
    return (
      <div className="start-screen">
        <p className="start-subtitle">방에 접속 중...</p>
      </div>
    );
  }

  const myPlayer = myPlayerIndex !== null ? roomInfo.players[myPlayerIndex] : null;
  const isHost = myPlayer?.isHost ?? false;
  const isReady = myPlayer?.ready ?? false;
  const allReady = roomInfo.players.length >= 2 && roomInfo.players.every(p => p.ready || p.isHost);

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  return (
    <div className="start-screen">
      <h1 className="start-title">Splendor Online</h1>

      <div className="lobby-code-section">
        <p className="lobby-code-label">방 코드</p>
        <p className="lobby-code">{roomCode}</p>
        <button
          className="btn btn-cancel lobby-copy-btn"
          onClick={() => navigator.clipboard.writeText(roomCode)}
        >
          복사
        </button>
      </div>

      <div className="lobby-players">
        <p className="lobby-section-title">플레이어 ({roomInfo.players.length}/4)</p>
        {roomInfo.players.map((p, i) => (
          <div key={i} className={`lobby-player ${p.ready || p.isHost ? 'ready' : ''}`}>
            <span className="lobby-player-name">
              {p.name}
              {p.isHost && <span className="lobby-host-badge">HOST</span>}
            </span>
            <span className={`lobby-player-status ${p.ready ? 'ready' : ''}`}>
              {p.isHost ? '' : p.ready ? '준비 완료' : '대기 중'}
            </span>
          </div>
        ))}
      </div>

      {roomInfo.spectators.length > 0 && (
        <div className="lobby-players lobby-spectators">
          <p className="lobby-section-title">관전자 ({roomInfo.spectators.length})</p>
          {roomInfo.spectators.map((name, i) => (
            <div key={i} className="lobby-player spectator">
              <span className="lobby-player-name">{name}</span>
              <span className="lobby-player-status spectator">관전</span>
            </div>
          ))}
        </div>
      )}

      {lobbyError && (
        <div className="lobby-error" onClick={clearLobbyError}>
          {lobbyError}
        </div>
      )}

      <div className="lobby-actions">
        {isSpectator ? (
          <>
            <button className="btn btn-confirm" onClick={switchToPlayer}>참가하기</button>
            <button className="btn btn-cancel" onClick={handleLeave}>나가기</button>
          </>
        ) : (
          <>
            {!isHost && (
              <>
                <button
                  className={`btn ${isReady ? 'btn-cancel' : 'btn-confirm'}`}
                  onClick={() => setReady(!isReady)}
                >
                  {isReady ? '준비 취소' : '준비'}
                </button>
                <button className="btn btn-reserve" onClick={switchToSpectator}>
                  관전하기
                </button>
              </>
            )}
            {isHost && (
              <button
                className="btn btn-start"
                onClick={startGame}
                disabled={!allReady}
              >
                게임 시작 {!allReady && `(${roomInfo.players.length < 2 ? '최소 2명 필요' : '전원 준비 필요'})`}
              </button>
            )}
            <button className="btn btn-cancel" onClick={handleLeave}>나가기</button>
          </>
        )}
      </div>
    </div>
  );
}
