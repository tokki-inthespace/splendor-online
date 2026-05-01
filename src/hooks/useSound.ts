import { useCallback, useSyncExternalStore } from 'react';
import { isMuted, setMuted, subscribeMute } from '../utils/sound';

export function useSound() {
  const muted = useSyncExternalStore(subscribeMute, isMuted, isMuted);
  const toggleMute = useCallback(() => {
    setMuted(!isMuted());
  }, []);
  return { muted, toggleMute };
}
