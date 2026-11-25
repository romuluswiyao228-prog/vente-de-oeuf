import { useMemo, useRef, useState } from 'react'
import type { SeriesPoint } from '../../lib/dashboard'

const W = 760
const H = 280
const PAD = { l: 58, r: 14, t: 14, b: 30 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b
const CURVE = '#2a78d6'
const COMPARE = '#898781'

function niceMax(v: number): number {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

interface Props {
  data: SeriesPoint[]
  compare?: SeriesPoint[] | null
  formatValue: (n: number) => string
  formatTick?: (n: number) => string
  ariaLabel: string
}

export default function LineChart({ data, compare = null, formatValue, formatTick, ariaLabel }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const empty = data.every((p) => !p.valeur)

  const geom = useMemo(() => {
    const n = data.length
    const maxRaw = Math.max(
      ...data.map((p) => p.valeur),
      ...(compare ?? []).map((p) => p.valeur),
      0,
    )
    const max = niceMax(maxRaw)
    const x = (i: number) => (n <= 1 ? PAD.l + PLOT_W / 2 : PAD.l + (i * PLOT_W) / (n - 1))
    const y = (v: number) => PAD.t + PLOT_H - (v / max) * PLOT_H
    const pts = data.map((p, i) => `${x(i).toFixed(1)},${y(p.valeur).toFixed(1)}`)
    const line = n > 1 ? `M${pts.join(' L')}` : ''
    const area =
      n > 1
        ? `${line} L${x(n - 1).toFixed(1)},${(PAD.t + PLOT_H).toFixed(1)} L${x(0).toFixed(1)},${(PAD.t + PLOT_H).toFixed(1)} Z`
        : ''
    const cmpPts = compare && compare.length === n ? compare.map((p, i) => `${x(i).toFixed(1)},${y(p.valeur).toFixed(1)}`) : null
    const cmpLine = cmpPts && n > 1 ? `M${cmpPts.join(' L')}` : ''
    return { n, max, x, y, line, area, cmpLine, cmpPts }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, compare])

  if (empty) {
    return (
      <div className="grid h-64 place-items-center rounded-2xl bg-sand/50 text-sm text-bark-soft">
        Pas encore de données
      </div>
    )
  }

  const ticks = 4
  const xLabelEvery = Math.max(1, Math.ceil(geom.n / 6))
  const hoverPt = hover != null ? { x: geom.x(hover), y: geom.y(data[hover].valeur) } : null
  const cmpVal = hover != null && compare?.[hover] ? compare[hover].valeur : null

  const onMove = (clientX: number) => {
    const svg = svgRef.current
    if (!svg || geom.n === 0) return
    const r = svg.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * W
    const step = geom.n <= 1 ? 0 : PLOT_W / (geom.n - 1)
    const idx = Math.round((px - PAD.l) / step)
    setHover(Math.max(0, Math.min(geom.n - 1, idx)))
  }

  // Position de la bulle : centrée sur le point, bornée dans le SVG
  let bubble: { x: number; y: number; left: boolean; right: boolean } | null = null
  if (hoverPt) {
    const bw = 170
    const bx = Math.max(PAD.l + bw / 2, Math.min(W - PAD.r - bw / 2, hoverPt.x))
    bubble = { x: bx, y: Math.max(PAD.t + 24, hoverPt.y - 14), left: bx === hoverPt.x, right: bx === hoverPt.x }
  }

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={ariaLabel}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => {
          const t = e.touches[0]
          if (t) onMove(t.clientX)
        }}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CURVE} stopOpacity="0.22" />
            <stop offset="100%" stopColor={CURVE} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grille + axe Y */}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = (geom.max / ticks) * i
          const y = geom.y(v)
          return (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="var(--color-line)" strokeWidth="1" />
              <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-bark-soft)">
                {(formatTick ?? formatValue)(v)}
              </text>
            </g>
          )
        })}

        {/* Axe X */}
        {data.map((p, i) =>
          i % xLabelEvery === 0 || i === geom.n - 1 ? (
            <text key={i} x={geom.x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-bark-soft)">
              {p.label}
            </text>
          ) : null,
        )}

        {/* Aire */}
        {geom.area && (
          <path d={geom.area} fill="url(#dashArea)" className="dash-fade" style={{ animationDelay: '500ms' }} />
        )}

        {/* Comparaison (pointillés gris) */}
        {geom.cmpLine && (
          <path
            d={geom.cmpLine}
            fill="none"
            stroke={COMPARE}
            strokeWidth="2"
            strokeDasharray="6 5"
            className="dash-fade"
            style={{ animationDelay: '400ms' }}
          />
        )}

        {/* Courbe principale */}
        {geom.line && (
          <path
            d={geom.line}
            fill="none"
            stroke={CURVE}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dash-draw"
            pathLength={1}
          />
        )}

        {/* Points */}
        {data.map((p, i) => (
          <circle
            key={i}
            cx={geom.x(i)}
            cy={geom.y(p.valeur)}
            r="3.5"
            fill={CURVE}
            className="dash-rise"
            style={{ animationDelay: `${300 + i * 40}ms` }}
          />
        ))}

        {/* Survol */}
        {hover != null && hoverPt && (
          <g>
            <line
              x1={hoverPt.x}
              x2={hoverPt.x}
              y1={PAD.t}
              y2={PAD.t + PLOT_H}
              stroke="var(--color-bark-soft)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <circle cx={hoverPt.x} cy={hoverPt.y} r="5" fill={CURVE} stroke="#fff" strokeWidth="2" />
            {compare && cmpVal != null && (
              <circle
                cx={hoverPt.x}
                cy={geom.y(cmpVal)}
                r="4"
                fill={COMPARE}
                stroke="#fff"
                strokeWidth="1.5"
              />
            )}
            {bubble && (
              <g>
                <rect
                  x={bubble.x - 85}
                  y={bubble.y - 10}
                  width="170"
                  height={cmpVal != null ? 52 : 40}
                  rx="10"
                  fill="var(--color-bark)"
                  opacity="0.92"
                />
                <text x={bubble.x} y={bubble.y + 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">
                  {data[hover].label}
                </text>
                <text x={bubble.x} y={bubble.y + 24} textAnchor="middle" fontSize="12" fontWeight="700" fill={CURVE === '#2a78d6' ? '#9ec5f5' : '#fff'}>
                  {formatValue(data[hover].valeur)}
                </text>
                {cmpVal != null && (
                  <text x={bubble.x} y={bubble.y + 40} textAnchor="middle" fontSize="11" fill="#c9c4bb">
                    Préc. : {formatValue(cmpVal)}
                  </text>
                )}
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}
