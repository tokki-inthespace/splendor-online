import { useState, useEffect, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { useMultiplayerStore } from './store/multiplayerStore';
import { Game } from './components/Game';
import { Lobby } from './components/Lobby';
import './App.css';

type AppMode = 'menu' | 'singleplayer' | 'lobby-create' | 'lobby-join' | 'lobby';

function App() {
  const singleStore = useGameStore();
  const mpStore = useMultiplayerStore();
  const [mode, setMode] = useState<AppMode>('menu');
  const reconnectAttempted = useRef(false);

  // 페이지 로드 시 sessionStorage에 sessionId가 있으면 자동 재접속 시도
  useEffect(() => {
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;

    const savedSession = sessionStorage.getItem('splendor-session-id');
    if (savedSession && mode === 'menu') {
      mpStore.connect();
      setMode('lobby');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const goToMenu = () => {
    mpStore.disconnect();
    setMode('menu');
  };

  // 싱글플레이 게임 중
  if (mode === 'singleplayer' && singleStore.gameState) {
    return <Game mode="singleplayer" />;
  }

  // 멀티플레이 — lobby 모드 내에서 상태에 따라 분기
  if (mode === 'lobby') {
    // 게임 진행 중
    if (mpStore.gameState) {
      return <Game mode="multiplayer" />;
    }

    // 로비 (방 정보 있음)
    if (mpStore.roomInfo) {
      return <Lobby onLeave={goToMenu} />;
    }

    // 재접속 중
    if (mpStore.connectionStatus === 'reconnecting') {
      return (
        <div className="start-screen">
          <h1 className="start-title">Splendor Online</h1>
          <p className="start-subtitle">재접속 중...</p>
          <button className="btn btn-cancel" onClick={goToMenu}>취소</button>
        </div>
      );
    }

    // 연결 중 / 방 생성 대기
    if (mpStore.connectionStatus !== 'disconnected') {
      return (
        <div className="start-screen">
          <h1 className="start-title">Splendor Online</h1>
          <p className="start-subtitle">연결 중...</p>
          {mpStore.lobbyError && (
            <div className="lobby-error" onClick={mpStore.clearLobbyError}>
              {mpStore.lobbyError}
            </div>
          )}
          <button className="btn btn-cancel" onClick={goToMenu}>취소</button>
        </div>
      );
    }

    // 연결 끊김 (leaveRoom 후) → 메뉴로
    setMode('menu');
  }

  // 싱글플레이에서 resetGame 후 → 메뉴 렌더
  if (mode === 'singleplayer' && !singleStore.gameState) {
    setMode('menu');
  }

  // 멀티플레이 서브 메뉴 (방 만들기 / 참가)
  if (mode === 'lobby-create' || mode === 'lobby-join') {
    return (
      <div className="start-screen">
        <h1 className="start-title">Splendor Online</h1>
        <p className="start-subtitle">멀티플레이</p>

        {mode === 'lobby-create' ? (
          <div className="lobby-menu">
            <button
              className="btn btn-start"
              onClick={() => {
                const name = playerName.trim() || 'Player';
                mpStore.connect();
                mpStore.createRoom(name);
                setMode('lobby');
              }}
            >
              방 만들기
            </button>
            <button
              className="btn btn-confirm"
              onClick={() => setMode('lobby-join')}
            >
              방 참가
            </button>
            <button className="btn btn-cancel" onClick={() => setMode('menu')}>
              뒤로
            </button>
          </div>
        ) : (
          <div className="lobby-menu">
            <input
              className="name-input room-code-input"
              type="text"
              placeholder="방 코드 입력 (4자리)"
              value={roomCodeInput}
              onChange={e => setRoomCodeInput(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              onKeyDown={e => {
                if (e.key === 'Enter' && roomCodeInput.length === 4) {
                  const name = playerName.trim() || 'Player';
                  mpStore.connect();
                  mpStore.joinRoom(roomCodeInput, name);
                  setMode('lobby');
                }
              }}
            />
            <button
              className="btn btn-start"
              disabled={roomCodeInput.length !== 4}
              onClick={() => {
                const name = playerName.trim() || 'Player';
                mpStore.connect();
                mpStore.joinRoom(roomCodeInput, name);
                setMode('lobby');
              }}
            >
              참가
            </button>
            <button className="btn btn-cancel" onClick={() => setMode('lobby-create')}>
              뒤로
            </button>
          </div>
        )}

        {mpStore.lobbyError && (
          <div className="lobby-error" onClick={mpStore.clearLobbyError}>
            {mpStore.lobbyError}
          </div>
        )}
      </div>
    );
  }

  // 메인 메뉴 (기본)
  return (
    <div className="start-screen">
      <h1 className="start-title">Splendor Online</h1>
      <p className="start-subtitle">보석 상인이 되어 15점을 먼저 달성하세요</p>
      {mpStore.lobbyError && (
        <div className="lobby-error" onClick={mpStore.clearLobbyError}>
          {mpStore.lobbyError}
        </div>
      )}
      <div className="start-form">
        <input
          className="name-input"
          type="text"
          placeholder="닉네임 입력"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
        />
      </div>
      <div className="mode-buttons">
        <button
          className="btn btn-start"
          onClick={() => {
            const name = playerName.trim() || 'Player';
            singleStore.startGame(name);
            setMode('singleplayer');
          }}
        >
          1인 플레이 (vs AI)
        </button>
        <button
          className="btn btn-multiplayer"
          onClick={() => setMode('lobby-create')}
        >
          멀티플레이
        </button>
      </div>
    </div>
  );
}

export default App;
