import { useRef, type ReactNode } from 'react'

/**
 * Carte en verre dépoli. `delay` décale l'apparition échelonnée.
 * `lit` allume brièvement la carte (événement temps réel).
 * Inclinaison 3D max 8° au survol sur ordinateur (pointer: fine).
 */
export default function GlassCard({
  children,
  className = '',
  delay = 0,
  lit = false,
  light = false,
}: {
  children: ReactNode
  className?: string
  delay?: number
  lit?: boolean
  light?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el || light || !window.matchMedia('(pointer: fine)').matches) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`
  }

  const onLeave = () => {
    const el = ref.current
    if (el) el.style.transform = ''
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`d2-card d2-tilt d2-enter ${lit ? 'd2-lit' : ''} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
