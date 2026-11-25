import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GlassCard from '../../components/dash2/GlassCard'
import PeriodPicker, { prevPeriod, rangeGroup, type PeriodRange } from '../../components/dash2/PeriodPicker'
import ProdChart, { type ChartSeries } from '../../components/dash2/ProdChart'
import BarsChart from '../../components/dash2/BarsChart'
import ActivityList from '../../components/dash2/ActivityList'
import CountUp from '../../components/dashboard/CountUp'
import Skeleton from '../../components/Skeleton'
import {
  fetchDash2Activity,
  fetchDash2ByBatch,
  fetchDash2ExpensesByCategory,
  fetchDash2Series,
  fetchDash2Summary,
  fetchDash2Top,
  subscribeDash2,
  useLightMode,
  type Dash2Activity,
  type Dash2BatchRow,
  type Dash2ExpenseCat,
  type Dash2SeriesPoint,
  type Dash2Summary,
  type Dash2Top,
} from '../../lib/dash2'
import {
  addFarmEvent,
  computeFarmAlerts,
  computeTreasury,
  exportCsv,
  fmtDateFr,
  fmtPlateaux,
  todayISO,
} from '../../lib/farm'
import type { FarmData } from '../../lib/farm'
import { useAdminSession } from '../../lib/store'
import { formatPrice } from '../../lib/store'
import type { FarmAlert } from '../../lib/types'

interface Props {
  farm: FarmData
  farmRefetch: () => void
  onGoFarm: (sub: string) => void
  onShowOld: () => void
}

const MINT = '#3ddc97'
const BAND_COLORS = ['#f0b35e', '#8ab4f8', '#d8a7ff', '#7ee0d2', '#ff8a66', '#f4d35e']
const MARKERS: ChartSeries['marker'][] = ['circle', 'square', 'triangle']

const money = (n: number) => formatPrice(Math.round(n))

function pct(cur: number, prev: number): number | null {
  if (!prev) return null
  return ((cur - prev) / prev) * 100
}

function Pill({ value }: { value: number | null }) {
  if (value === null) return <span className="d2-pill flat">—</span>
  const up = value >= 0
  return (
    <span className={`d2-pill ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(0)} %
    </span>
  )
}

interface DashData {
  summary: Dash2Summary
  summaryPrev: Dash2Summary | null
  byBatch: Dash2BatchRow[]
  prodSeries: Record<string, Dash2SeriesPoint[]>
  prodLabels: string[]
  ventesSeries: Dash2SeriesPoint[]
  depensesSeries: Dash2SeriesPoint[]
  barLabels: string[]
  top: Dash2Top[]
  expCats: Dash2ExpenseCat[]
  activities: Dash2Activity[]
}

const TABLE_TO_CARD: Record<string, string> = {
  egg_movements: 'prod',
  farm_sales: 'ventes',
  client_payments: 'encaisser',
  farm_expenses: 'depenses',
  cash_movements: 'caisse',
  orders: 'ventes',
  farm_events: 'chart',
}

export default function Dashboard2({ farm, farmRefetch, onGoFarm, onShowOld }: Props) {
  const light = useLightMode()
  const { session } = useAdminSession()
  const firstName = session?.user.email?.split('@')[0] ?? ''

  const [range, setRange] = useState<PeriodRange>(() => {
    const to = todayISO()
    const d = new Date(to + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() - 29)
    return { from: d.toISOString().slice(0, 10), to }
  })
  const [compare, setCompare] = useState(true)
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [lit, setLit] = useState<Set<string>>(new Set())
  const [showEventForm, setShowEventForm] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const litTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const group = rangeGroup(range)
  const prev = useMemo(() => prevPeriod(range), [range])

  const activeBatches = useMemo(
    () => farm.batches.filter((b) => !['termine', 'terminee'].includes(b.status as string)),
    [farm.batches],
  )

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const batchIds = activeBatches.map((b) => b.id)
        const [summary, summaryPrev, byBatch, prodTotal, ventesSeries, depensesSeries, top, expCats, activities, ...prodPerBatch] =
          await Promise.all([
            fetchDash2Summary(range.from, range.to),
            fetchDash2Summary(prev.from, prev.to),
            fetchDash2ByBatch(range.from, range.to),
            fetchDash2Series('production', range.from, range.to, group),
            fetchDash2Series('ventes', range.from, range.to, group),
            fetchDash2Series('depenses', range.from, range.to, group),
            fetchDash2Top(range.from, range.to),
            fetchDash2ExpensesByCategory(range.from, range.to),
            fetchDash2Activity(40),
            ...batchIds.map((id) => fetchDash2Series(`production:${id}` as const, range.from, range.to, group)),
          ])
        const prodSeries: Record<string, Dash2SeriesPoint[]> = { total: prodTotal }
        batchIds.forEach((id, i) => {
          prodSeries[id] = prodPerBatch[i]
        })
        setData({
          summary,
          summaryPrev,
          byBatch,
          prodSeries,
          prodLabels: prodTotal.map((p) => p.label),
          ventesSeries,
          depensesSeries,
          barLabels: ventesSeries.map((p) => p.label),
          top,
          expCats,
          activities,
        })
      } catch (e) {
        console.error('dash2 load', e)
        if (!silent) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [range.from, range.to, prev.from, prev.to, group, activeBatches],
  )

  useEffect(() => {
    void load(false)
  }, [load, retry])

  // Temps réel : rechargement throttlé + carte qui s'allume
  useEffect(() => {
    const unsub = subscribeDash2((table) => {
      const card = TABLE_TO_CARD[table]
      if (card) {
        setLit((prevSet) => new Set(prevSet).add(card))
        if (litTimer.current) clearTimeout(litTimer.current)
        litTimer.current = setTimeout(() => setLit(new Set()), 1600)
      }
      farmRefetch()
      void load(true)
    })
    return unsub
  }, [load, farmRefetch])

  /* ------------------------------ Données dérivées ------------------------------ */

  const tray = data?.summary.eggs_per_tray ?? farm.eggsPerTray ?? 30
  const prodToday = data?.summary.production_aujourdhui ?? []
  const sainsToday = prodToday.reduce((n, b) => n + b.sains, 0)
  const cassesToday = prodToday.reduce((n, b) => n + b.casses, 0)
  const sainsVeille = data?.summary.production_veille?.sains ?? 0
  const stockTotal = (data?.summary.stock ?? []).reduce((n, s) => n + s.stock_oeufs, 0)

  const treasury = useMemo(() => computeTreasury(farm, range.from, range.to), [farm, range.from, range.to])

  const alerts = useMemo<FarmAlert[]>(() => {
    const list = computeFarmAlerts(farm)
    const today = todayISO()
    const cutoff = (() => {
      const d = new Date(today + 'T12:00:00Z')
      d.setUTCDate(d.getUTCDate() - 7)
      return d.toISOString().slice(0, 10)
    })()
    // Stock bas par bande (< 1 plateau)
    for (const s of data?.summary.stock ?? []) {
      if (s.stock_oeufs < tray && s.stock_oeufs > 0) {
        list.push({ id: `stock-${s.batch_id}`, level: 'warn', text: `Stock bas : ${s.name} (${fmtPlateaux(s.stock_oeufs, tray)})` })
      }
    }
    // Œufs de plus de 7 jours en réserve (approx. FIFO : stock − production des 7 derniers jours)
    let aged = 0
    for (const b of activeBatches) {
      const stock = (data?.summary.stock ?? []).find((s) => s.batch_id === b.id)?.stock_oeufs ?? 0
      const recent = farm.eggMovements
        .filter((m) => m.batch_id === b.id && m.kind === 'ponte' && m.date > cutoff)
        .reduce((n, m) => n + m.qty_eggs, 0)
      aged += Math.max(0, stock - recent)
    }
    if (aged > 0) {
      list.push({ id: 'aged-eggs', level: 'warn', text: `${fmtPlateaux(aged, tray)} en réserve depuis plus de 7 jours` })
    }
    // Baisse de ponte > 10 % par rapport à la veille (uniquement si les deux jours sont saisis)
    if (sainsToday > 0 && sainsVeille > 0 && sainsToday < sainsVeille * 0.9) {
      const drop = ((sainsVeille - sainsToday) / sainsVeille) * 100
      list.push({ id: 'ponte-drop', level: 'warn', text: `Ponte en baisse de ${drop.toFixed(0)} % par rapport à la veille` })
    }
    // Clients avec solde ancien (> 30 jours)
    const oldLimit = (() => {
      const d = new Date(today + 'T12:00:00Z')
      d.setUTCDate(d.getUTCDate() - 30)
      return d.toISOString().slice(0, 10)
    })()
    const oldDebts = farm.sales.filter(
      (s) => s.date < oldLimit && s.total_fcfa - s.paid_amount > 0,
    )
    if (oldDebts.length > 0) {
      const amount = oldDebts.reduce((n, s) => n + (s.total_fcfa - s.paid_amount), 0)
      list.push({
        id: 'old-debts',
        level: 'warn',
        text: `${oldDebts.length} vente${oldDebts.length > 1 ? 's' : ''} avec solde depuis plus de 30 j (${money(amount)})`,
      })
    }
    return list
  }, [farm, data, tray, sainsToday, sainsVeille, activeBatches])

  /* ------------------------------ Séries graphiques ------------------------------ */

  const prodChartSeries = useMemo<ChartSeries[]>(() => {
    if (!data) return []
    const out: ChartSeries[] = []
    // Générale en vert menthe
    out.push({
      key: 'total',
      label: 'Générale',
      color: MINT,
      data: (data.prodSeries.total ?? []).map((p) => p.valeur),
      marker: 'circle',
      dashed: true,
    })
    for (const b of activeBatches) {
      out.push({
        key: b.id,
        label: b.name,
        color: b.display_color || BAND_COLORS[out.length % BAND_COLORS.length],
        data: (data.prodSeries[b.id] ?? []).map((p) => p.valeur),
        marker: MARKERS[out.length % MARKERS.length],
      })
    }
    return out
  }, [data, activeBatches])

  const prodFormat = useCallback(
    (v: number) => `${fmtPlateaux(Math.round(v), tray)} · ${Math.round(v)} œufs`,
    [tray],
  )
  const prodTick = useCallback((v: number) => fmtPlateaux(Math.round(v), tray), [tray])
  const moneyFmt = useCallback((v: number) => money(v), [])

  /* ------------------------------ Rapport / export ------------------------------ */

  const reportRows = useMemo(() => {
    if (!data) return []
    return data.prodLabels.map((label, i) => {
      const row: Record<string, number> = {}
      let total = 0
      for (const b of activeBatches) {
        const v = data.prodSeries[b.id]?.[i]?.valeur ?? 0
        row[b.id] = v
        total += v
      }
      row.__total = total
      return { label, row, total }
    })
  }, [data, activeBatches])

  const reportPhrase = useMemo(() => {
    if (!data || reportRows.length === 0) return ''
    // Bande la plus stable : plus faible écart-type relatif
    let stable: { name: string; cv: number } | null = null
    for (const b of activeBatches) {
      const vals = data.prodSeries[b.id]?.map((p) => p.valeur) ?? []
      if (vals.length < 2) continue
      const mean = vals.reduce((a, v) => a + v, 0) / vals.length
      if (mean <= 0) continue
      const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length)
      const cv = sd / mean
      if (!stable || cv < stable.cv) stable = { name: b.name, cv }
    }
    // Plus forte baisse jour/jour toutes bandes
    let worst: { label: string; drop: number; batch: string } | null = null
    for (const b of activeBatches) {
      const pts = data.prodSeries[b.id] ?? []
      for (let i = 1; i < pts.length; i++) {
        const drop = pts[i - 1].valeur - pts[i].valeur
        if (drop > 0 && (!worst || drop > worst.drop)) {
          worst = { label: pts[i].label, drop, batch: b.name }
        }
      }
    }
    const events = farm.farmEvents.filter((e) => e.date >= range.from && e.date <= range.to)
    const parts: string[] = []
    if (stable) parts.push(`Bande la plus stable : ${stable.name}.`)
    if (worst) {
      parts.push(
        `Plus forte baisse : ${worst.batch} le ${worst.label} (−${fmtPlateaux(Math.round(worst.drop), tray)}).`,
      )
    }
    if (events.length > 0) {
      parts.push(`Événements : ${events.map((e) => `${e.title} (${fmtDateFr(e.date)})`).join(', ')}.`)
    }
    return parts.join(' ')
  }, [data, reportRows, activeBatches, farm.farmEvents, range, tray])

  const exportReportCsv = () => {
    if (!data) return
    exportCsv(
      `rapport-porcs-${range.from}_${range.to}.csv`,
      ['Jour', ...activeBatches.map((b) => b.name), 'Total'],
      reportRows.map((r) => [
        r.label,
        ...activeBatches.map((b) => fmtPlateaux(Math.round(r.row[b.id] ?? 0), tray)),
        fmtPlateaux(Math.round(r.total), tray),
      ]),
    )
  }

  const openReport = () => {
    setReportOpen(true)
    setTimeout(() => window.print(), 80)
  }

  /* --------------------------------- Rendu --------------------------------- */

  const periodLabel = `${fmtDateFr(range.from)} → ${fmtDateFr(range.to)}`

  const ventesPct = data?.summaryPrev ? pct(data.summary.ventes, data.summaryPrev.ventes) : null
  const depensesPct = data?.summaryPrev ? pct(data.summary.depenses, data.summaryPrev.depenses) : null
  const benefPct = data?.summaryPrev ? pct(data.summary.benefice, data.summaryPrev.benefice) : null
  const prodPct = sainsVeille > 0 ? pct(sainsToday, sainsVeille) : null

  const progressPct =
    data?.summaryPrev && data.summaryPrev.ventes > 0
      ? Math.min(100, (data.summary.ventes / data.summaryPrev.ventes) * 100)
      : null

  const errorBox = (msg: string) => (
    <div className="col-span-full rounded-2xl border border-red-400/40 bg-red-500/10 p-5">
      <p className="text-sm font-semibold text-red-300">Impossible de charger les données : {msg}</p>
      <button type="button" onClick={() => setRetry((r) => r + 1)} className="d2-btn mt-3">
        Réessayer
      </button>
    </div>
  )

  return (
    <div className={`dash2 ${light ? 'd2-light' : ''}`}>
      {/* En-tête */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--d2-cream)' }}>
            Bonjour{firstName ? `, ${firstName}` : ''}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <span className="d2-live">En direct</span>
            <button type="button" onClick={onShowOld} className="text-xs underline opacity-60 hover:opacity-100">
              Ancien tableau de bord
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker range={range} onChange={setRange} compare={compare} onCompare={setCompare} />
          <button type="button" className="d2-btn" onClick={exportReportCsv} disabled={!data}>
            CSV
          </button>
          <button type="button" className="d2-btn primary" onClick={openReport}>
            Exporter
          </button>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="d2-card mb-5 !border-[#ff8a66]/40" style={{ background: 'rgba(255,138,102,0.07)' }}>
          <p className="d2-label mb-2">Alertes</p>
          <ul className="space-y-1.5">
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm" style={{ color: a.level === 'warn' ? '#ff9d7a' : 'var(--d2-dim)' }}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.level === 'warn' ? '#ff8a66' : '#3ddc97' }} />
                {a.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && !data ? (
        errorBox(error)
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-[18px]" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Production du jour */}
          <GlassCard className="mb-4" lit={lit.has('prod')} light={light} delay={0}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="d2-label">Production du jour</p>
                <p className="d2-value mt-1 text-4xl font-bold">
                  <CountUp value={sainsToday} format={(n) => fmtPlateaux(Math.round(n), tray)} />
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--d2-dim)' }}>
                  {Math.round(sainsToday)} œufs sains{cassesToday > 0 ? ` · ${cassesToday} cassés` : ''}
                  {prodPct !== null && (
                    <span className="ml-2"><Pill value={prodPct} /></span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="d2-btn primary" onClick={() => onGoFarm('production')}>
                  Saisir la ponte
                </button>
                <button type="button" className="d2-btn" onClick={() => onGoFarm('ventes')}>
                  Nouvelle vente
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {prodToday.map((b, i) => {
                const batch = farm.batches.find((x) => x.id === b.batch_id)
                const effectif = batch?.effectif_actuel ?? 0
                const taux = effectif > 0 ? (b.sains / effectif) * 100 : null
                return (
                  <div key={b.batch_id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.display_color || BAND_COLORS[i % BAND_COLORS.length] }} />
                      <p className="truncate text-sm font-semibold">{b.name}</p>
                    </div>
                    <p className="d2-value mt-1 text-xl font-bold">{fmtPlateaux(b.sains, tray)}</p>
                    <p className="text-[0.7rem]" style={{ color: 'var(--d2-dim)' }}>
                      {taux !== null ? `Taux de ponte ${taux.toFixed(1)} %` : "Renseigne l'effectif pour voir le taux de ponte"}
                    </p>
                  </div>
                )
              })}
              {prodToday.length === 0 && (
                <p className="text-sm sm:col-span-2 lg:col-span-4" style={{ color: 'var(--d2-dim)' }}>
                  Aucune ponte saisie aujourd'hui.
                </p>
              )}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Cassés aujourd'hui</p>
                <p className="d2-value mt-1 text-xl font-bold">{cassesToday} œufs</p>
              </div>
            </div>
          </GlassCard>

          {/* Cartes indicateurs */}
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <GlassCard lit={lit.has('ventes')} light={light} delay={60}>
              <p className="d2-label">Ventes · {periodLabel}</p>
              <p className="d2-value mt-1 text-2xl font-bold"><CountUp value={data.summary.ventes} format={money} /></p>
              <div className="mt-1 flex items-center gap-2"><Pill value={ventesPct} /></div>
            </GlassCard>
            <GlassCard lit={lit.has('depenses')} light={light} delay={120}>
              <p className="d2-label">Dépenses · {periodLabel}</p>
              <p className="d2-value mt-1 text-2xl font-bold"><CountUp value={data.summary.depenses} format={money} /></p>
              <div className="mt-1 flex items-center gap-2"><Pill value={depensesPct} /></div>
            </GlassCard>
            <GlassCard lit={lit.has('prod')} light={light} delay={180}>
              <p className="d2-label">Stock d'œufs</p>
              <p className="d2-value mt-1 text-2xl font-bold">{fmtPlateaux(stockTotal, tray)}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--d2-dim)' }}>
                {stockTotal} œufs · {data.summary.stock.length} bande{data.summary.stock.length > 1 ? 's' : ''}
              </p>
            </GlassCard>
            <GlassCard light={light} delay={240}>
              <p className="d2-label">Bénéfice · {periodLabel}</p>
              <p className="d2-value mt-1 text-2xl font-bold"><CountUp value={data.summary.benefice} format={money} /></p>
              <div className="mt-1 flex items-center gap-2"><Pill value={benefPct} /></div>
            </GlassCard>
            <GlassCard lit={lit.has('encaisser')} light={light} delay={300}>
              <p className="d2-label">À encaisser</p>
              <p className="d2-value mt-1 text-2xl font-bold"><CountUp value={data.summary.a_encaisser} format={money} /></p>
              <p className="mt-1 text-xs" style={{ color: 'var(--d2-dim)' }}>Soldes clients + commandes non payées</p>
            </GlassCard>
            <GlassCard lit={lit.has('caisse')} light={light} delay={360}>
              <p className="d2-label">Trésorerie · {periodLabel}</p>
              <p className={`mt-1 text-2xl font-bold ${treasury.solde >= 0 ? '' : ''}`} style={{ color: treasury.solde >= 0 ? MINT : '#ff9d7a' }}>
                <CountUp value={treasury.solde} format={money} />
              </p>
              <button type="button" onClick={() => onGoFarm('caisse')} className="mt-1 text-xs underline" style={{ color: 'var(--d2-dim)' }}>
                Voir la caisse
              </button>
            </GlassCard>
            <GlassCard light={light} delay={420} className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="d2-label">Ventes vs période précédente</p>
                {progressPct !== null && <span className="text-xs" style={{ color: 'var(--d2-dim)' }}>{progressPct.toFixed(0)} %</span>}
              </div>
              <div className="d2-progress mt-3">
                <div style={{ width: `${progressPct ?? 0}%` }} />
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--d2-dim)' }}>
                {money(data.summary.ventes)} vs {money(data.summaryPrev?.ventes ?? 0)} sur {fmtDateFr(prev.from)} → {fmtDateFr(prev.to)}
              </p>
            </GlassCard>
          </div>

          {/* Graphique production */}
          <GlassCard className="mb-4" lit={lit.has('chart')} light={light} delay={480}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Production par bande</h2>
                <p className="text-xs" style={{ color: 'var(--d2-dim)' }}>{periodLabel} · en œufs (axe en plateaux)</p>
              </div>
              <button type="button" className="d2-btn !py-1.5 text-xs" onClick={() => setShowEventForm((v) => !v)}>
                Ajouter un événement
              </button>
            </div>

            {showEventForm && (
              <EventForm
                batches={activeBatches}
                onDone={async (date, batchId, title, note) => {
                  await addFarmEvent(date, batchId, title, note)
                  farmRefetch()
                  void load(true)
                  setShowEventForm(false)
                }}
              />
            )}

            {prodChartSeries.length === 0 ? (
              <p className="py-10 text-center text-sm" style={{ color: 'var(--d2-dim)' }}>Aucune donnée de production sur la période.</p>
            ) : (
              <ProdChart
                labels={data.prodLabels}
                series={prodChartSeries}
                formatValue={(v, s) => `${s.label} : ${prodFormat(v)}`}
                formatTick={prodTick}
                events={farm.farmEvents
                  .filter((e) => e.date >= range.from && e.date <= range.to)
                  .map((e) => ({ date: e.date, title: e.title }))}
                ariaLabel={`Courbes de production par bande sur ${periodLabel}`}
                light={light}
              />
            )}
          </GlassCard>

          {/* Ventes & dépenses */}
          <GlassCard className="mb-4" light={light} delay={540}>
            <h2 className="mb-1 text-lg font-bold">Ventes et dépenses</h2>
            <p className="mb-3 text-xs" style={{ color: 'var(--d2-dim)' }}>{periodLabel}</p>
            <BarsChart
              labels={data.barLabels}
              ventes={data.ventesSeries.map((p) => p.valeur)}
              depenses={data.depensesSeries.map((p) => p.valeur)}
              formatValue={moneyFmt}
              ariaLabel={`Barres des ventes et dépenses sur ${periodLabel}`}
              light={light}
            />
            {compare && (
              <p className="mt-2 text-[0.7rem]" style={{ color: 'var(--d2-dim)' }}>
                Période précédente : ventes {money(data.summaryPrev?.ventes ?? 0)} · dépenses {money(data.summaryPrev?.depenses ?? 0)}
              </p>
            )}
          </GlassCard>

          {/* Activités */}
          <GlassCard light={light} delay={600}>
            <h2 className="mb-3 text-lg font-bold">Activités récentes</h2>
            <ActivityList activities={data.activities} light={light} />
          </GlassCard>
        </>
      ) : null}

      {/* Navigation flottante mobile */}
      <nav className="d2-bottomnav" aria-label="Navigation rapide">
        <button type="button" className="active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Tableau de bord</button>
        <button type="button" onClick={() => onGoFarm('production')}>Production</button>
        <button type="button" onClick={() => onGoFarm('ventes')}>Ventes</button>
        <button type="button" onClick={() => onGoFarm('caisse')}>Caisse</button>
      </nav>

      {/* Rapport imprimable */}
      {reportOpen && data && (
        <div className="d2-print-root">
          <h1>Rapport de production — {periodLabel}</h1>
          <p>Généré le {fmtDateFr(todayISO())} · {data.summary.stock.length} bande(s) · stock total {fmtPlateaux(stockTotal, tray)}</p>

          {data.prodLabels.length > 0 && (
            <svg viewBox="0 0 800 200" className="d2-print-chart" preserveAspectRatio="none">
              {(() => {
                const vals = activeBatches.map((b) => (data.prodSeries[b.id] ?? []).map((p) => p.valeur))
                const all = vals.flat().concat((data.prodSeries.total ?? []).map((p) => p.valeur))
                const max = Math.max(1, ...all)
                const n = data.prodLabels.length
                return activeBatches.map((b, bi) => {
                  const pts = data.prodSeries[b.id] ?? []
                  const d = pts
                    .map((p, i) => {
                      const x = n <= 1 ? 400 : (i / (n - 1)) * 760 + 20
                      const y = 170 - (p.valeur / max) * 150
                      return `${i === 0 ? 'M' : 'L'}${x.toFixed(0)},${y.toFixed(0)}`
                    })
                    .join(' ')
                  const color = ['#c0714a', '#4a7ab5', '#7d8f6a', '#8a5f8f'][bi % 4]
                  return <path key={b.id} d={d} fill="none" stroke={color} strokeWidth="2" />
                })
              })()}
            </svg>
          )}

          <table className="d2-print-table">
            <thead>
              <tr>
                <th>Jour</th>
                {activeBatches.map((b) => <th key={b.id}>{b.name}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  {activeBatches.map((b) => (
                    <td key={b.id}>{fmtPlateaux(Math.round(r.row[b.id] ?? 0), tray)}</td>
                  ))}
                  <td><strong>{fmtPlateaux(Math.round(r.total), tray)}</strong></td>
                </tr>
              ))}
              <tr>
                <td><strong>Total</strong></td>
                {activeBatches.map((b) => (
                  <td key={b.id}><strong>{fmtPlateaux(Math.round(reportRows.reduce((n, r) => n + (r.row[b.id] ?? 0), 0)), tray)}</strong></td>
                ))}
                <td><strong>{fmtPlateaux(Math.round(reportRows.reduce((n, r) => n + r.total, 0)), tray)}</strong></td>
              </tr>
            </tbody>
          </table>

          <h2 style={{ marginTop: 16 }}>Synthèse</h2>
          <ul style={{ fontSize: 12 }}>
            <li>Ventes : {money(data.summary.ventes)} · Dépenses : {money(data.summary.depenses)} · Bénéfice : {money(data.summary.benefice)}</li>
            <li>À encaisser : {money(data.summary.a_encaisser)} · Trésorerie : {money(treasury.solde)}</li>
            {reportPhrase && <li>{reportPhrase}</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

/* Petit formulaire d'événement daté (réutilise addFarmEvent). */
function EventForm({
  batches,
  onDone,
}: {
  batches: { id: string; name: string }[]
  onDone: (date: string, batchId: string | null, title: string, note: string) => Promise<void>
}) {
  const [date, setDate] = useState(todayISO())
  const [batchId, setBatchId] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErr('Titre requis.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await onDone(date, batchId || null, title.trim(), note.trim())
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2 lg:grid-cols-5">
      <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="d2-input" aria-label="Date" />
      <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="d2-select" aria-label="Bande">
        <option value="">Toutes les bandes</option>
        {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Événement (ex : changement d'aliment)" className="d2-input" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="d2-input" />
      <button type="submit" disabled={busy} className="d2-btn primary justify-center">
        {busy ? '…' : 'Enregistrer'}
      </button>
      {err && <p className="text-xs text-red-300 sm:col-span-2 lg:col-span-5">{err}</p>}
    </form>
  )
}
