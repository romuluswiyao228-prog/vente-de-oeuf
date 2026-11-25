import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { prefetchPublicData } from './lib/store'

// Réchauffe le cache localStorage et les images de l'accueil en parallèle.
prefetchPublicData()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
