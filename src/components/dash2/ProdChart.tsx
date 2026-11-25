import { useMemo, useRef, useState } from 'react'

export interface ChartSeries {
  key: string
  label: string
  color: string
  data: number[]
  marker: 'circle' | 'square' | 'triangle'
  dashed?: boolean
}

interface Props {
  labels: string[]
  series: ChartSeries[]
  /** Texte de la bulle (ex. « 46P22 · 1 402 œufs ») */
  formatValue: (v: number, s: ChartSeries) => string
  /** Graduations de l'axe */
  formatTick?: (v: number) => string
  /** Événements datés (date ISO yyyy-mm-dd) */
  events?: { date: string; title: string }[]
  ariaLabel: string
  light?: boolean
}

const W = 800
const H = 260
const PAD_L = 46
const PAD_R = 14
const PAD_T = 14
const PAD_B = 30
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

function isoToLabel(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  return `${d}/${m}`
}

function Marker({ shape, x, y, color, light }: { shape: ChartSeries['marker']; x: number; y: number; color: string; light?: boolean }) {
  const fill = light ? '#4a3626' : '#171310'
  if (shape === 'square') {
    return <rect x={x - 3.5} y={y - 3.5} width={7} height={7} fill={color} stroke={fill} strokeWidth={1.5} />
  }
  if (shape === 'triangle') {
    return <polygon points={`${x},${y - 5} ${x + 5},${y + 4} ${x - 5},${y + 4}`} fill={color} stroke={fill} strokeWidth={1.2} />
  }
  return <circle cx={x} cy={y} r={4} fill={color} stroke={fill} strokeWidth={1.5} />
}

export default function ProdChart({ labels, series, formatValue, formatTick, events = [], ariaLabel, light }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => series.filter((s) => !hidden.has(s.key)), [series, hidden])

  const { max, points } = useMemo(() => {
    let m = 1
    for (const s of visible) for (const v of s.data) if (v > m) m = v
    const pts = visible.map((s) =>
      s.data.map((v, i) => {
        const x = labels.length <= 1 ? PAD_L + PLOT_W / 2 : PAD_L + (i / (labels.length - 1)) * PLOT_W
        const y = PAD_T + PLOT_H - (Math.max(0, v) / m) * PLOT_H
        return { x, y, v }
      }),
    )
    return { max: m, points: pts }
  }, [visible, labels.length])

  const pathOf = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const ticks = useMemo(() => {
    const n = 4
    return Array.from({ length: n + 1 }, (_, i) => (max * i) / n)
  }, [max])

  const eventXs = useMemo(() => {
    return events
      .map((e) => {
        const idx = labels.indexOf(isoToLabel(e.date))
        if (idx < 0) return null
        const x = labels.length <= 1 ? PAD_L + PLOT_W / 2 : PAD_L + (idx / (labels.length - 1)) * PLOT_W
        return { x, title: e.title }
      })
      .filter((e): e is { x: number; title: string } => e !== null)
  }, [events, labels])

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    if (labels.length <= 1) {
      setHover(0)
      return
    }
    const idx = Math.round(((px - PAD_L) / PLOT_W) * (labels.length - 1))
    setHover(Math.max(0, Math.min(labels.length - 1, idx)))
  }

  const onLeave = () => setHover(null)

  const tipX = hover !== null && labels.length > 1
    ? PAD_L + (hover / (labels.length - 1)) * PLOT_W
    : null

  return (
    <div ref={wrapRef} className="relative">
      {/* Bascule des courbes */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {series.map((s) => {
          const off = hidden.has(s.key)
          return (
            <button
              key={s.key}
              type="button"
              onClick={() =>
                setHidden((prev) => {
                  const next = new Set(prev)
                  if (next.has(s.key)) next.delete(s.key)
                  else next.add(s.key)
                  return next
                })
              }
              className="d2-btn !px-2.5 !py-1 text-[0.68rem]"
              style={off ? { opacity: 0.45 } : undefined}
              aria-pressed={!off}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          )
        })}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 'auto', maxHeight: 300 }}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onTouchStart={(e) => {
          const t = e.touches[0]
          if (!t) return
          const rect = e.currentTarget.getBoundingClientRect()
          const px = ((t.clientX - rect.left) / rect.width) * W
          if (labels.length > 1) {
            const idx = Math.round(((px - PAD_L) / PLOT_W) * (labels.length - 1))
            setHover(Math.max(0, Math.min(labels.length - 1, idx)))
          }
        }}
      >
        {/* Grille + axe */}
        {ticks.map((t, i) => {
          const y = PAD_T + PLOT_H - (t / max) * PLOT_H
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="10" fill="rgba(245,234,217,0.5)">
                {formatTick ? formatTick(t) : Math.round(t)}
              </text>
            </g>
          )
        })}
        {/* Labels X (échantillonnés) */}
        {labels.map((l, i) => {
          if (labels.length > 12 && i % Math.ceil(labels.length / 8) !== 0 && i !== labels.length - 1) return null
          const x = labels.length <= 1 ? PAD_L + PLOT_W / 2 : PAD_L + (i / (labels.length - 1)) * PLOT_W
          return (
            <text key={i} x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(245,234,217,0.5)">
              {l}
            </text>
          )
        })}

        {/* Événements datés */}
        {eventXs.map((ev, i) => (
          <g key={i}>
            <line x1={ev.x} x2={ev.x} y1={PAD_T} y2={PAD_T + PLOT_H} className="d2-event-line" strokeWidth="1.2" />
            <text x={ev.x + 3} y={PAD_T + 10} fontSize="9" fill="rgba(245,234,217,0.65)">
              {ev.title.length > 22 ? ev.title.slice(0, 22) + '…' : ev.title}
            </text>
          </g>
        ))}

        {/* Séries */}
        {visible.map((s, si) => {
          const pts = points[si] ?? []
          if (pts.length === 0) return null
          return (
            <g key={s.key}>
              <path
                d={pathOf(pts)}
                fill="none"
                stroke={s.color}
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '6 4' : undefined}
                className="d2-line"
                pathLength={1400}
                style={{ animationDelay: `${si * 120}ms` }}
              />
              {pts.map((p, i) => (
                <Marker
                  key={i}
                  shape={s.marker}
                  x={p.x}
                  y={p.y}
                  color={s.color}
                  light={light}
                />
              ))}
            </g>
          )
        })}

        {/* Ligne de survol */}
        {hover !== null && tipX !== null && labels.length > 1 && (
          <line x1={tipX} x2={tipX} y1={PAD_T} y2={PAD_T + PLOT_H} stroke="rgba(245,234,217,0.35)" strokeWidth="1" />
        )}
      </svg>

      {/* Bulle */}
      {hover !== null && (
        <div
          className="d2-tip"
          style={{
            left: `${tipX !== null ? (tipX / W) * 100 : 50}%`,
            top: 0,
          }}
        >
          <p className="font-semibold">{labels[hover]}</p>
          {visible.map((s, si) => {
            const v = points[si]?.[hover]?.v
            if (v === undefined) return null
            return (
              <p key={s.key} className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label} : {formatValue(v, s)}
              </p>
            )
          })}
        </div>
      )}

      {/* Résumé accessible */}
      <p className="sr-only">{ariaLabel}</p>
    </div>
  )
}
