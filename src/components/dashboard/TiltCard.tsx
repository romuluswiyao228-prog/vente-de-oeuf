import { useRef, type ReactNode } from 'react'

/**
 * Carte avec léger tilt 3D au survol (max 6°), ordinateur uniquement
 * (pointer: fine). Sur téléphone : simple fondu d'apparition.
 */
export default function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el || !window.matchMedia('(pointer: fine)').matches) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(800px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`
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
      className={`rounded-3xl bg-white p-5 shadow-card transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  )
}
