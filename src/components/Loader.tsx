import { useEffect, useState } from 'react'

/** Écran de chargement initial : œuf qui balance + poussin qui pop, puis fondu de sortie. */
const SESSION_KEY = 'lb-loader-seen'

export default function Loader() {
  // N'afficher le loader qu'une fois par session (sessionStorage)
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem(SESSION_KEY)
    } catch {
      return true
    }
  })
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    if (!visible) return
    const t1 = setTimeout(() => setLeaving(true), 1400)
    const t2 = setTimeout(() => setVisible(false), 1900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream transition-opacity duration-500 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-label="Chargement"
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Poussin */}
        <svg
          viewBox="0 0 64 64"
          className="animate-pop absolute h-16 w-16 text-terra"
          style={{ animationDelay: '300ms' }}
          fill="currentColor"
          aria-hidden="true"
        >
          <ellipse cx="32" cy="40" rx="14" ry="13" />
          <circle cx="32" cy="22" r="9" />
          <path d="M41 21l6 1.5-5 3z" fill="#e8a94f" />
          <circle cx="35" cy="20" r="1.4" fill="#4a3626" />
          <path d="M24 42q-6 4-2 8" stroke="#e8a94f" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M40 42q6 4 2 8" stroke="#e8a94f" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
        {/* Œuf */}
        <svg
          viewBox="0 0 64 64"
          className="animate-wiggle h-24 w-24 text-terra-soft"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M32 8c8 0 15 11.5 15 21.5S40 52 32 52s-15-9.5-15-22.5S24 8 32 8z" />
        </svg>
      </div>
      <p className="mt-8 font-display text-2xl font-medium text-bark">Préparation de la basse-cour…</p>
      <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-sand">
        <div className="h-full w-full origin-left animate-[loadbar_1.4s_ease-in-out_forwards] rounded-full bg-terra" />
      </div>
      <style>{`@keyframes loadbar { from { transform: scaleX(0);} to { transform: scaleX(1);} }`}</style>
    </div>
  )
}
