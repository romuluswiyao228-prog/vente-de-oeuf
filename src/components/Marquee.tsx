import type { ReactNode } from 'react'

interface MarqueeProps {
  children: ReactNode
  slow?: boolean
  className?: string
  itemClassName?: string
}

/** Bandeau défilant infini — le contenu est dupliqué pour une boucle continue. Pause au survol. */
export default function Marquee({ children, slow = false, className = '', itemClassName = '' }: MarqueeProps) {
  const trackClass = slow ? 'marquee-track marquee-track-slow' : 'marquee-track'
  return (
    <div className={`marquee overflow-hidden ${className}`}>
      <div className={trackClass}>
        <div className={`flex shrink-0 items-center ${itemClassName}`}>{children}</div>
        <div className={`flex shrink-0 items-center ${itemClassName}`} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
