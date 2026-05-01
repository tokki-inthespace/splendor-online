import { useSound } from '../hooks/useSound';

export function SoundToggle() {
  const { muted, toggleMute } = useSound();
  const label = muted ? '효과음 켜기' : '효과음 끄기';
  return (
    <button
      type="button"
      className="sound-toggle"
      onClick={toggleMute}
      aria-label={label}
      title={label}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
