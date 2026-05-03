import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeToggle } from './components/ThemeToggle.tsx'
import { SoundToggle } from './components/SoundToggle.tsx'

if (import.meta.env.DEV) {
  import('./devTools').then(m => m.installDevTools());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeToggle />
    <SoundToggle />
    <App />
  </StrictMode>,
)
