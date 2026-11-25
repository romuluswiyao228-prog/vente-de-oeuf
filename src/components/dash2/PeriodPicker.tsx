import { useMemo } from 'react'

export interface PeriodRange {
  from: string
  to: string
}

const DAY = 86400000

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return iso(new Date())
}

function shiftDays(dateStr: string, days: number): string {
  return iso(new Date(new Date(dateStr + 'T12:00:00Z').getTime() + days * DAY))
}

export const SHORTCUTS: { label: string; range: () => PeriodRange }[] = [
  { label: "Aujourd'hui", range: () => ({ from: today(), to: today() }) },
  {
    label: 'Hier',
    range: () => {
      const t = shiftDays(today(), -1)
      return { from: t, to: t }
    },
  },
  {
    label: '7 jours',
    range: () => ({ from: shiftDays(today(), -6), to: today() }),
  },
  {
    label: '30 jours',
    range: () => ({ from: shiftDays(today(), -29), to: today() }),
  },
  {
    label: 'Ce mois',
    range: () => ({ from: today().slice(0, 8) + '01', to: today() }),
  },
  {
    label: 'Mois dernier',
    range: () => {
      const t = new Date()
      const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1))
      const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0))
      return { from: iso(first), to: iso(last) }
    },
  },
]

/** Période précédente de même durée, juste avant `from`. */
export function prevPeriod(r: PeriodRange): PeriodRange {
  const len = Math.round(
    (new Date(r.to + 'T12:00:00Z').getTime() - new Date(r.from + 'T12:00:00Z').getTime()) / DAY,
  ) + 1
  const to = shiftDays(r.from, -1)
  const from = shiftDays(to, -(len - 1))
  return { from, to }
}

/** Groupe de série : jour si la plage est courte, sinon mois. */
export function rangeGroup(r: PeriodRange): 'jour' | 'mois' {
  const len =
    Math.round(
      (new Date(r.to + 'T12:00:00Z').getTime() - new Date(r.from + 'T12:00:00Z').getTime()) / DAY,
    ) + 1
  return len <= 62 ? 'jour' : 'mois'
}

function fmtFr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

interface Props {
  range: PeriodRange
  onChange: (r: PeriodRange) => void
  compare: boolean
  onCompare: (v: boolean) => void
}

export default function PeriodPicker({ range, onChange, compare, onCompare }: Props) {
  const durationDays = useMemo(
    () =>
      Math.round(
        (new Date(range.to + 'T12:00:00Z').getTime() -
          new Date(range.from + 'T12:00:00Z').getTime()) /
          DAY,
      ) + 1,
    [range],
  )

  const shift = (dir: 1 | -1) => {
    onChange({
      from: shiftDays(range.from, dir * durationDays),
      to: shiftDays(range.to, dir * durationDays),
    })
  }

  const inputCls = 'd2-input d2-select'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="d2-btn" onClick={() => shift(-1)} aria-label="Période précédente">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <input
        type="date"
        value={range.from}
        max={range.to}
        onChange={(e) => e.target.value && onChange({ ...range, from: e.target.value })}
        className={inputCls}
        aria-label="Du"
      />
      <span className="text-xs opacity-60">→</span>
      <input
        type="date"
        value={range.to}
        min={range.from}
        onChange={(e) => e.target.value && onChange({ ...range, to: e.target.value })}
        className={inputCls}
        aria-label="Au"
      />
      <button type="button" className="d2-btn" onClick={() => shift(1)} aria-label="Période suivante">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div className="flex flex-wrap gap-1.5">
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            type="button"
            className="d2-btn !px-3 !py-1.5 text-[0.72rem]"
            onClick={() => onChange(s.range())}
          >
            {s.label}
          </button>
        ))}
      </div>

      <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs" style={{ color: 'var(--d2-dim)' }}>
        <input
          type="checkbox"
          checked={compare}
          onChange={(e) => onCompare(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#3ddc97]"
        />
        Comparer avec la période précédente
      </label>

      <span className="sr-only">
        Période du {fmtFr(range.from)} au {fmtFr(range.to)}
      </span>
    </div>
  )
}
