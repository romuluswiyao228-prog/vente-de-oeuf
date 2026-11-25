import { useEffect, useState } from 'react'
import type { FarmData } from '../../lib/farm'
import { computeFarmAlerts } from '../../lib/farm'
import type { Product } from '../../lib/types'
import FarmEggs from './farm/FarmEggs'
import FarmProduction from './farm/FarmProduction'
import FarmSales from './farm/FarmSales'
import FarmClients from './farm/FarmClients'
import FarmAnimals from './farm/FarmAnimals'
import FarmIncubation from './farm/FarmIncubation'
import FarmSupplies from './farm/FarmSupplies'
import FarmExpenses from './farm/FarmExpenses'
import FarmCash from './farm/FarmCash'
import FarmTasks from './farm/FarmTasks'

const SUB_TABS = [
  { id: 'production', label: 'Production' },
  { id: 'ventes', label: 'Ventes' },
  { id: 'clients', label: 'Clients' },
  { id: 'oeufs', label: 'Œufs' },
  { id: 'animaux', label: 'Animaux' },
  { id: 'incubation', label: 'Incubation' },
  { id: 'appro', label: 'Approvisionnements' },
  { id: 'depenses', label: 'Dépenses' },
  { id: 'caisse', label: 'Caisse' },
  { id: 'rappels', label: 'Rappels' },
] as const

type SubTab = (typeof SUB_TABS)[number]['id']

interface Props {
  farm: FarmData
  loading: boolean
  refetch: () => void
  products: Product[]
  /** Sous-onglet demandé de l'extérieur (ex : depuis le tableau de bord) */
  requestedSub?: { sub: SubTab; nonce: number } | null
}

export default function FarmTab({ farm, loading, refetch, products, requestedSub }: Props) {
  const [sub, setSub] = useState<SubTab>('production')
  const alerts = computeFarmAlerts(farm)

  useEffect(() => {
    if (requestedSub) setSub(requestedSub.sub)
  }, [requestedSub])

  const shared = { farm, refetch, products }

  return (
    <div className="space-y-6">
      {/* Sous-onglets */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`btn shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${
              sub === t.id ? 'bg-terra text-cream' : 'bg-white text-bark-soft shadow-card hover:text-bark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Alertes calculées */}
      {alerts.length > 0 && (
        <div className="rounded-3xl border border-terra/30 bg-terra-soft/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-terra-dark">
            Alertes ({alerts.length})
          </h2>
          <ul className="mt-3 space-y-1.5">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={`flex items-start gap-2 text-sm ${
                  a.level === 'warn' ? 'font-medium text-terra-dark' : 'text-bark-soft'
                }`}
              >
                <span aria-hidden="true">{a.level === 'warn' ? '⚠' : 'ℹ'}</span>
                {a.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="rounded-[2rem] bg-white p-10 text-center text-sm text-bark-soft shadow-card">
          Chargement de la ferme…
        </p>
      ) : (
        <>
          {sub === 'production' && <FarmProduction {...shared} />}
          {sub === 'ventes' && <FarmSales {...shared} />}
          {sub === 'clients' && <FarmClients {...shared} />}
          {sub === 'oeufs' && <FarmEggs {...shared} goToIncubation={() => setSub('incubation')} />}
          {sub === 'animaux' && <FarmAnimals {...shared} />}
          {sub === 'incubation' && <FarmIncubation {...shared} />}
          {sub === 'appro' && <FarmSupplies {...shared} />}
          {sub === 'depenses' && <FarmExpenses {...shared} />}
          {sub === 'caisse' && <FarmCash {...shared} />}
          {sub === 'rappels' && <FarmTasks {...shared} />}
        </>
      )}
    </div>
  )
}
