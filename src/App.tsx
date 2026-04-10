import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { Game } from './components/Game';
import './App.css';

function App() {
  const { gameState, startGame } = useGameStore();
  const [playerName, setPlayerName] = useState('');

  if (!gameState) {
    return (
      <div className="start-screen">
        <h1 className="start-title">Splendor Online</h1>
        <p className="start-subtitle">보석 상인이 되어 15점을 먼저 달성하세요</p>
        <div className="start-form">
          <input
            className="name-input"
            type="text"
            placeholder="닉네임 입력"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && playerName.trim() && startGame(playerName.trim())}
          />
          <button
            className="btn btn-start"
            onClick={() => startGame(playerName.trim() || 'Player')}
          >
            게임 시작
          </button>
        </div>
      </div>
    );
  }

  return <Game />;
}

export default App;
