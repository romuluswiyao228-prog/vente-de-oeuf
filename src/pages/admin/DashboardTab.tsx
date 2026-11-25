import { useEffect, useMemo, useState, type ReactNode } from 'react'
import CountUp from '../../components/dashboard/CountUp'
import TiltCard from '../../components/dashboard/TiltCard'
import LineChart from '../../components/dashboard/LineChart'
import Bar3D from '../../components/dashboard/Bar3D'
import Skeleton from '../../components/Skeleton'
import {
  fetchExpensesByCategory,
  fetchSeries,
  fetchSummary,
  fetchTopProducts,
  type DashboardMetric,
  type DashboardPeriod,
  type DashboardSummary,
  type ExpenseCategoryTotal,
  type SeriesPoint,
  type TopProduct,
} from '../../lib/dashboard'
import { EXPENSE_CATEGORIES } from '../../lib/types'
import { computeFarmAlerts, type FarmData } from '../../lib/farm'
import { formatPrice } from '../../lib/store'

const METRICS: { value: DashboardMetric; label: string; money: boolean }[] = [
  { value: 'ventes', label: 'Ventes', money: true },
  { value: 'commandes', label: 'Commandes', money: false },
  { value: 'ponte', label: 'Ponte', money: false },
  { value: 'depenses', label: 'Dépenses', money: true },
  { value: 'benefice', label: 'Bénéfice', money: true },
]

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: '7j', label: '7 jours' },
  { value: '30j', label: '30 jours' },
  { value: '12m', label: '12 mois' },
]

const EXPENSE_LABELS: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label]),
)

function money(n: number): string {
  return formatPrice(Math.round(n))
}

function moneyTick(n: number): string {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`
  return `${Math.round(n)}`
}

function intTick(n: number): string {
  return `${Math.round(n)}`
}

interface Props {
  farm: FarmData
  onNavigate: (tab: string) => void
}

export default function DashboardTab({ farm, onNavigate }: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [metric, setMetric] = useState<DashboardMetric>('ventes')
  const [period, setPeriod] = useState<DashboardPeriod>('30j')
  const [compare, setCompare] = useState(false)
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [seriesPrev, setSeriesPrev] = useState<SeriesPoint[] | null>(null)
  const [top, setTop] = useState<TopProduct[]>([])
  const [expensesCat, setExpensesCat] = useState<ExpenseCategoryTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  // Synthèse (une fois)
  useEffect(() => {
    let cancelled = false
    setSummaryError(null)
    fetchSummary()
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch((e) => {
        console.error('dashboard_summary', e)
        if (!cancelled) setSummaryError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [retry])

  // Série + tops + dépenses par catégorie (à chaque changement)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    const tag = <T,>(name: string, p: Promise<T>): Promise<T> =>
      p.catch((e) => {
        console.error(name, e)
        throw e
      })
    Promise.all([
      tag('dashboard_series', fetchSeries(metric, period, 0)),
      compare ? tag('dashboard_series(prev)', fetchSeries(metric, period, 1)) : Promise.resolve(null),
      tag('dashboard_top_products', fetchTopProducts(period)),
      tag('dashboard_expenses_by_category', fetchExpensesByCategory(period)),
    ])
      .then(([cur, prev, t, e]) => {
        if (cancelled) return
        setSeries(cur)
        setSeriesPrev(prev)
        setTop(t)
        setExpensesCat(e)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [metric, period, compare, retry])

  const alerts = useMemo(() => computeFarmAlerts(farm), [farm])
  const warnCount = alerts.filter((a) => a.level === 'warn').length

  const metricDef = METRICS.find((m) => m.value === metric)!
  const isMoney = metricDef.money
  const formatValue = isMoney ? money : (n: number) => Math.round(n).toLocaleString('fr-FR')
  const formatTick = isMoney ? moneyTick : intTick

  const stockEggs = summary
    ? summary.stock_boutique_trays * summary.eggs_per_tray + summary.reserve_oeufs
    : 0

  const topItems = top.map((t) => ({
    label: t.name,
    value: t.quantite,
    display: `${Math.round(t.quantite)} × — ${money(t.montant)}`,
  }))
  const expenseItems = expensesCat.map((c) => ({
    label: EXPENSE_LABELS[c.categorie] ?? c.categorie,
    value: c.montant,
    display: money(c.montant),
  }))

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? ''
  const ariaChart = `Courbe des ${metricDef.label.toLowerCase()} sur ${periodLabel}${compare ? ', comparée à la période précédente' : ''}`

  const counters: { label: string; value: ReactNode; sub?: string; alert?: boolean }[] = summary
    ? [
        {
          label: 'Ventes du jour',
          value: <CountUp value={summary.ventes_jour} format={money} />,
          sub: `${summary.commandes_jour} commande${summary.commandes_jour > 1 ? 's' : ''} aujourd'hui`,
        },
        {
          label: 'Commandes du jour',
          value: <CountUp value={summary.commandes_jour} />,
        },
        {
          label: 'Stock d\u2019œufs',
          value: <CountUp value={stockEggs} />,
          sub: `${summary.stock_boutique_trays} plateau${summary.stock_boutique_trays > 1 ? 'x' : ''} boutique · ${summary.reserve_oeufs} en réserve`,
        },
        {
          label: 'Bénéfice du mois',
          value: <CountUp value={summary.benefice_mois} format={money} />,
          sub: `Ventes ${money(summary.ventes_mois)} · Dépenses ${money(summary.depenses_mois)}`,
        },
        ...(summary.a_encaisser != null
          ? [{ label: 'À encaisser', value: <CountUp value={summary.a_encaisser} format={money} /> }]
          : []),
        {
          label: 'Alertes ferme',
          value: <CountUp value={warnCount} />,
          alert: warnCount > 0,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Compteurs animés */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {summaryError ? (
          <div className="col-span-full rounded-3xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-700">
              Impossible de charger les données : {summaryError}
            </p>
            <button
              type="button"
              onClick={() => setRetry((r) => r + 1)}
              className="btn mt-3 rounded-full bg-terra px-4 py-1.5 text-sm font-semibold text-cream"
            >
              Réessayer
            </button>
          </div>
        ) : !summary ? (
          Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-3xl bg-white p-5 shadow-card">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-24" />
              </div>
            ))
        ) : (
          counters.map((c) => (
              <TiltCard key={c.label} className={c.alert ? 'border border-terra/40' : ''}>
                <button
                  type="button"
                  onClick={c.label === 'Alertes ferme' ? () => onNavigate('ferme') : undefined}
                  className={`block w-full text-left ${c.label === 'Alertes ferme' ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-label={c.label === 'Alertes ferme' ? 'Voir les alertes de la ferme' : undefined}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-bark-soft">{c.label}</p>
                  <p className={`mt-1 font-display text-2xl font-semibold ${c.alert ? 'text-terra-dark' : 'text-bark'}`}>
                    {c.value}
                  </p>
                  {c.sub && <p className="mt-1 text-xs text-bark-soft">{c.sub}</p>}
                </button>
              </TiltCard>
            ))
        )}
      </div>

      {/* Courbe principale */}
      <div className="rounded-[2rem] bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">Vue d'ensemble</h2>
          <div className="flex flex-wrap items-center gap-2">
            {METRICS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetric(m.value)}
                className={`btn rounded-full px-3.5 py-1.5 text-xs font-semibold sm:text-sm ${
                  metric === m.value ? 'bg-terra text-cream' : 'bg-sand text-bark-soft hover:text-bark'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`btn rounded-full px-3 py-1.5 text-xs font-semibold ${
                  period === p.value ? 'bg-bark text-cream' : 'border border-line text-bark-soft hover:text-bark'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-bark-soft">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="h-4 w-4 accent-terra"
            />
            Comparer avec la période précédente
          </label>
        </div>
        <div className="mt-5">
          {loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                Impossible de charger les données : {loadError}
              </p>
              <button
                type="button"
                onClick={() => setRetry((r) => r + 1)}
                className="btn mt-3 rounded-full bg-terra px-4 py-1.5 text-sm font-semibold text-cream"
              >
                Réessayer
              </button>
            </div>
          ) : loading && series.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <LineChart
              key={`${metric}-${period}-${compare}`}
              data={series}
              compare={compare ? seriesPrev : null}
              formatValue={formatValue}
              formatTick={formatTick}
              ariaLabel={ariaChart}
            />
          )}
          {compare && (
            <p className="mt-2 text-xs text-bark-soft">
              <span className="mr-3 inline-block h-0.5 w-6 bg-[#898781] align-middle" /> Période précédente
              <span className="mx-3 inline-block h-2.5 w-2.5 rounded-full bg-[#2a78d6] align-middle" /> Période actuelle
            </p>
          )}
        </div>
      </div>

      {/* Barres 3D */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-bark">Produits les plus vendus</h2>
          <p className="mt-1 text-xs text-bark-soft">{periodLabel}</p>
          <div className="mt-5">
            {loadError ? (
              <p className="text-sm font-semibold text-red-700">Impossible de charger les données : {loadError}</p>
            ) : loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Bar3D items={topItems} ariaLabel={`Top produits sur ${periodLabel}`} />
            )}
          </div>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-bark">Dépenses par catégorie</h2>
          <p className="mt-1 text-xs text-bark-soft">{periodLabel}</p>
          <div className="mt-5">
            {loadError ? (
              <p className="text-sm font-semibold text-red-700">Impossible de charger les données : {loadError}</p>
            ) : loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Bar3D items={expenseItems} ariaLabel={`Dépenses par catégorie sur ${periodLabel}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
