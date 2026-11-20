/**
 * Les vidéos (hero, histoire) ne doivent pas être lues automatiquement sur les
 * connexions lentes (saveData) ni quand l'utilisateur demande moins d'animations.
 */
export function canAutoplayVideo(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return true
}
