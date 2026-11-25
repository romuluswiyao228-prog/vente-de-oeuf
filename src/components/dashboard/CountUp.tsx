import { useEffect, useRef, useState } from 'react'

const DURATION = 1000

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Nombre qui défile de 0 à `value` en ~1 s (easing doux). prefers-reduced-motion : direct. */
export default function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(() => (reducedMotion() ? value : 0))
  const fromRef = useRef(0)
  const rafRef = useRef(0)
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString('fr-FR'))

  useEffect(() => {
    if (reducedMotion()) {
      setDisplay(value)
      return
    }
    const from = fromRef.current
    const to = value
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      setDisplay(from + (to - from) * easeOutCubic(t))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return <span className="tabular-nums">{fmt(display)}</span>
}
