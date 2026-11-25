import { useEffect, useState } from 'react'

export interface Bar3DItem {
  label: string
  value: number
  /** Texte affiché à droite de la barre */
  display: string
}

const PALETTE = ['#2a78d6', '#c0714a', '#7d8f6a', '#a35a38', '#5f7050', '#8a97b8', '#b98a5e', '#6b8f71']

function shade(hex: string, amt: number): string {
  // amt > 0 éclaircit, < 0 assombrit
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const DEPTH = 7
const BAR_H = 22

/** Barres horizontales avec relief 3D (face, dessus, côté), animation échelonnée. */
export default function Bar3D({ items, ariaLabel }: { items: Bar3DItem[]; ariaLabel: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  if (items.length === 0) {
    return <p className="rounded-2xl bg-sand/50 p-6 text-center text-sm text-bark-soft">Pas encore de données</p>
  }

  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div role="img" aria-label={ariaLabel} className="space-y-3">
      {items.map((item, i) => {
        const color = PALETTE[i % PALETTE.length]
        const w = Math.max(2, (item.value / max) * 100)
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-right text-xs font-medium text-bark sm:w-40 sm:text-sm" title={item.label}>
              {item.label}
            </span>
            <div className="relative h-8 min-w-0 flex-1">
              <svg
                viewBox="0 0 100 30"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
                aria-hidden="true"
              >
                {/* faces dans un groupe scalé horizontalement */}
                <g
                  style={{
                    transform: mounted ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin: '0 50%',
                    transition: `transform 700ms cubic-bezier(.2,.8,.2,1) ${i * 90}ms`,
                  }}
                >
                  {/* face avant */}
                  <rect x="0" y="8" width={w} height={BAR_H} rx="3" fill={color} />
                  {/* dessus */}
                  <polygon
                    points={`0,8 ${w},8 ${w + DEPTH},${8 - DEPTH} ${DEPTH},${8 - DEPTH}`}
                    fill={shade(color, 40)}
                  />
                  {/* côté */}
                  <polygon
                    points={`${w},8 ${w + DEPTH},${8 - DEPTH} ${w + DEPTH},${8 + BAR_H - DEPTH} ${w},${8 + BAR_H}`}
                    fill={shade(color, -35)}
                  />
                </g>
              </svg>
            </div>
            <span className="w-20 shrink-0 text-right text-xs font-semibold text-bark sm:text-sm">
              {item.display}
            </span>
          </div>
        )
      })}
    </div>
  )
}
