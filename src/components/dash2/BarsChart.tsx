import { useMemo, useState } from 'react'

interface Props {
  labels: string[]
  ventes: number[]
  depenses: number[]
  formatValue: (v: number) => string
  ariaLabel: string
  light?: boolean
}

const W = 800
const H = 240
const PAD_L = 8
const PAD_R = 8
const PAD_T = 16
const PAD_B = 28
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

export default function BarsChart({ labels, ventes, depenses, formatValue, ariaLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const max = useMemo(() => {
    let m = 1
    for (const v of ventes) if (v > m) m = v
    for (const v of depenses) if (v > m) m = v
    return m
  }, [ventes, depenses])

  const n = labels.length
  const groupW = n > 0 ? PLOT_W / n : PLOT_W
  const bw = Math.min(14, groupW * 0.3)

  const xOf = (i: number) => PAD_L + i * groupW + groupW / 2
  const yOf = (v: number) => PAD_T + PLOT_H - (Math.max(0, v) / max) * PLOT_H

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 'auto', maxHeight: 260 }}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + PLOT_H} y2={PAD_T + PLOT_H} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {labels.map((l, i) => {
          const cx = xOf(i)
          const vH = PAD_T + PLOT_H - yOf(ventes[i] ?? 0)
          const dH = PAD_T + PLOT_H - yOf(depenses[i] ?? 0)
          const delay = `${Math.min(i, 30) * 25}ms`
          const showLabel = n <= 12 || i % Math.ceil(n / 8) === 0 || i === n - 1
          return (
            <g key={i}>
              <rect
                x={i * groupW + PAD_L}
                y={PAD_T}
                width={groupW}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              <rect
                x={cx - bw - 2}
                y={yOf(ventes[i] ?? 0)}
                width={bw}
                height={Math.max(0, vH)}
                rx={Math.min(5, bw / 2)}
                fill="#3ddc97"
                className="d2-bar"
                style={{ animationDelay: delay, transformOrigin: `0 ${PAD_T + PLOT_H}px` }}
              />
              <rect
                x={cx + 2}
                y={yOf(depenses[i] ?? 0)}
                width={bw}
                height={Math.max(0, dH)}
                rx={Math.min(5, bw / 2)}
                fill="#ff8a66"
                className="d2-bar"
                style={{ animationDelay: delay, transformOrigin: `0 ${PAD_T + PLOT_H}px` }}
              />
              {showLabel && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(245,234,217,0.55)">
                  {l}
                </text>
              )}
            </g>
          )
        })}
        {/* Ligne de survol */}
        {hover !== null && (
          <line x1={xOf(hover)} x2={xOf(hover)} y1={PAD_T} y2={PAD_T + PLOT_H} stroke="rgba(245,234,217,0.35)" strokeWidth="1" />
        )}
      </svg>

      {/* Légende */}
      <div className="mt-1 flex gap-4 text-[0.7rem]" style={{ color: 'var(--d2-dim)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#3ddc97' }} /> Ventes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#ff8a66' }} /> Dépenses
        </span>
      </div>

      {hover !== null && (
        <div className="d2-tip" style={{ left: `${(xOf(hover) / W) * 100}%`, top: 0 }}>
          <p className="font-semibold">{labels[hover]}</p>
          <p>Ventes : {formatValue(ventes[hover] ?? 0)}</p>
          <p>Dépenses : {formatValue(depenses[hover] ?? 0)}</p>
        </div>
      )}
      <p className="sr-only">{ariaLabel}</p>
    </div>
  )
}
