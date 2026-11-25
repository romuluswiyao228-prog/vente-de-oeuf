import { useMemo, useState, type CSSProperties } from 'react'
import type { Dash2Activity } from '../../lib/dash2'
import { fmtDateFr } from '../../lib/farm'
import { formatPrice } from '../../lib/store'

const TYPE_META: Record<Dash2Activity['type'], { label: string; icon: string; color: string }> = {
  vente: { label: 'Ventes', icon: 'M3 3h2l2.4 12.4a1 1 0 0 0 1 .6h8.9a1 1 0 0 0 1-.8L21 8H6', color: '#3ddc97' },
  production: { label: 'Production', icon: 'M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5', color: '#f0b35e' },
  mouvement: { label: 'Mouvements', icon: 'M7 16V8m0 0L3 12m4-4 4 4M17 8v8m0 0 4-4m-4 4-4-4', color: '#c9b8a0' },
  depense: { label: 'Dépenses', icon: 'M12 2v20M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6', color: '#ff8a66' },
  commande: { label: 'Commandes site', icon: 'M6 6h15l-1.5 9h-12zM6 6 5 3H2M9 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', color: '#8ab4f8' },
  encaissement: { label: 'Encaissements', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#7ee0d2' },
  caisse: { label: 'Caisse', icon: 'M3 6h18M3 12h18M3 18h18', color: '#d8a7ff' },
}

function timeOf(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_STYLE: Record<string, CSSProperties> = {
  Payé: { background: 'rgba(61,220,151,0.16)', color: '#3ddc97' },
  'À payer': { background: 'rgba(255,138,102,0.16)', color: '#ff9d7a' },
  Partiel: { background: 'rgba(240,179,94,0.16)', color: '#f0b35e' },
}

interface Props {
  activities: Dash2Activity[]
  light?: boolean
}

export default function ActivityList({ activities }: Props) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activities.filter((a) => {
      if (type && a.type !== type) return false
      if (q && !a.label.toLowerCase().includes(q)) return false
      return true
    })
  }, [activities, query, type])

  const types = useMemo(() => [...new Set(activities.map((a) => a.type))], [activities])

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          className="d2-input flex-1 !py-2 text-xs"
          aria-label="Rechercher une activité"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="d2-select !py-2 text-xs" aria-label="Filtrer par type">
          <option value="">Tous les types</option>
          {types.map((t) => (
            <option key={t} value={t}>{TYPE_META[t]?.label ?? t}</option>
          ))}
        </select>
      </div>

      <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <li className="py-6 text-center text-xs" style={{ color: 'var(--d2-dim)' }}>
            Aucune activité.
          </li>
        )}
        {filtered.map((a) => {
          const meta = TYPE_META[a.type] ?? TYPE_META.mouvement
          return (
            <li
              key={`${a.type}-${a.ref_id}`}
              className="d2-enter flex items-center gap-3 rounded-xl px-2 py-2"
              style={{ animationDuration: '0.35s' }}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ background: `${meta.color}22`, color: meta.color }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={meta.icon} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium" style={{ color: 'var(--d2-cream)' }}>
                  {a.label}
                </span>
                <span className="block text-[0.7rem]" style={{ color: 'var(--d2-dim)' }}>
                  {fmtDateFr(a.date)} · {timeOf(a.at)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {a.montant !== null && (
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--d2-cream)' }}>
                    {formatPrice(a.montant)}
                  </span>
                )}
                <span
                  className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold"
                  style={STATUS_STYLE[a.status] ?? { background: 'rgba(255,255,255,0.1)', color: 'var(--d2-dim)' }}
                >
                  {a.status}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
