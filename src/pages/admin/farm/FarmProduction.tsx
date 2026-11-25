import { useMemo, useState, type FormEvent } from 'react'
import {
  addEggMovements,
  addFarmEvent,
  batchStockEggs,
  deleteBatchPrice,
  deleteFarmEvent,
  deleteProductionMovements,
  fmtDateFr,
  fmtPlateaux,
  priceAt,
  recordProduction,
  saveBatchPrice,
  todayISO,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import { formatPrice } from '../../../lib/store'
import type { FarmBatch, FarmEvent, Product } from '../../../lib/types'

const inputCls =
  'w-full rounded-xl border border-line bg-cream px-4 py-3 text-base text-bark placeholder:text-bark-soft/60 focus:border-terra focus:outline-none sm:text-sm'
const btnPrimary =
  'btn rounded-full bg-terra px-5 py-2.5 text-sm font-semibold text-cream hover:bg-terra-dark disabled:opacity-60'
const btnGhost =
  'btn rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-bark-soft hover:border-terra-soft hover:text-bark'
const card = 'rounded-[2rem] bg-white p-6 shadow-card'
const labelCls = 'mb-1.5 block text-sm font-medium text-bark'

interface Props {
  farm: FarmData
  refetch: () => void
  products: Product[]
}

/** Saisie du jour : une ligne par bande. */
interface Row {
  plateaux: string
  oeufs: string
  casses: string
}

const emptyRow = (): Row => ({ plateaux: '', oeufs: '', casses: '' })

export default function FarmProduction({ farm, refetch }: Props) {
  const tray = farm.eggsPerTray
  const layingBatches = farm.batches.filter((b) => b.status === 'actif' && b.kind === 'pondeuses')
  const allBatches = farm.batches.filter((b) => b.status === 'actif')

  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Sortie de stock
  const [showExit, setShowExit] = useState(false)
  const [exBatch, setExBatch] = useState('')
  const [exKind, setExKind] = useState<'casse' | 'perte' | 'don'>('casse')
  const [exQty, setExQty] = useState('')
  const [exNote, setExNote] = useState('')

  // Prix
  const [priceForm, setPriceForm] = useState<{ batchId: string; channel: string } | null>(null)
  const [pPrice, setPPrice] = useState('')
  const [pDate, setPDate] = useState(todayISO())
  const [pNote, setPNote] = useState('')

  // Événements
  const [showEvent, setShowEvent] = useState(false)
  const [evDate, setEvDate] = useState(todayISO())
  const [evBatch, setEvBatch] = useState('')
  const [evTitle, setEvTitle] = useState('')
  const [evNote, setEvNote] = useState('')

  const batchName = (id: string | null) =>
    id ? (farm.batches.find((b) => b.id === id)?.name ?? '—') : '—'
  const batchDot = (b: FarmBatch) =>
    b.display_color ? { backgroundColor: b.display_color } : undefined

  const rowOf = (id: string): Row => rows[id] ?? emptyRow()
  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [id]: { ...(r[id] ?? emptyRow()), ...patch } }))

  /** Total d'une ligne en œufs sains (plateaux × tray + détachés). */
  const rowSains = (r: Row) => (parseInt(r.plateaux, 10) || 0) * tray + (parseInt(r.oeufs, 10) || 0)

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setMsg({ type: 'ok', text: okText })
      refetch()
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Une erreur est survenue.' })
    } finally {
      setBusy(false)
    }
  }

  const submitProduction = (e: FormEvent) => {
    e.preventDefault()
    const targets = layingBatches
      .map((b) => ({ b, r: rowOf(b.id) }))
      .filter(({ r }) => (parseInt(r.plateaux, 10) || 0) + (parseInt(r.oeufs, 10) || 0) + (parseInt(r.casses, 10) || 0) > 0)
    if (targets.length === 0) {
      setMsg({ type: 'err', text: 'Renseigne au moins une bande.' })
      return
    }
    for (const { r } of targets) {
      const o = parseInt(r.oeufs, 10) || 0
      if (o < 0 || o >= tray) {
        setMsg({ type: 'err', text: `Œufs détachés : entre 0 et ${tray - 1} par bande.` })
        return
      }
    }
    void run(async () => {
      for (const { b, r } of targets) {
        await recordProduction(
          b.id,
          date,
          parseInt(r.plateaux, 10) || 0,
          parseInt(r.oeufs, 10) || 0,
          parseInt(r.casses, 10) || 0,
        )
      }
    }, 'Production enregistrée.')
    setRows({})
  }

  /** Saisies des 14 derniers jours : mouvements ponte/casse groupés par bande + date. */
  const saisies = useMemo(() => {
    const since = new Date(`${todayISO()}T00:00:00Z`)
    since.setUTCDate(since.getUTCDate() - 13)
    const sinceStr = since.toISOString().slice(0, 10)
    const map = new Map<string, { batch_id: string; date: string; sains: number; casses: number; total: number }>()
    for (const m of farm.eggMovements) {
      if (!m.batch_id || m.date < sinceStr || m.date > todayISO()) continue
      if (m.kind !== 'ponte' && m.kind !== 'casse') continue
      if (m.note !== 'Saisie production') continue
      const key = `${m.batch_id}|${m.date}`
      const cur = map.get(key) ?? { batch_id: m.batch_id, date: m.date, sains: 0, casses: 0, total: 0 }
      if (m.kind === 'ponte') {
        cur.total += m.qty_eggs
        cur.sains += m.qty_eggs
      } else {
        cur.casses += -m.qty_eggs
        cur.sains += m.qty_eggs
      }
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
  }, [farm.eggMovements])

  const editSaisie = (s: { batch_id: string; date: string; sains: number; casses: number }) => {
    setDate(s.date)
    setRows({
      [s.batch_id]: {
        plateaux: String(Math.floor(s.sains / tray)),
        oeufs: String(s.sains % tray),
        casses: String(s.casses),
      },
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteSaisie = (s: { batch_id: string; date: string }) => {
    if (!window.confirm(`Supprimer la saisie du ${fmtDateFr(s.date)} pour ${batchName(s.batch_id)} ?`)) return
    void run(() => deleteProductionMovements(s.batch_id, s.date), 'Saisie supprimée.')
  }

  const submitExit = (e: FormEvent) => {
    e.preventDefault()
    const q = parseInt(exQty, 10)
    if (!exBatch) {
      setMsg({ type: 'err', text: 'Choisis une bande.' })
      return
    }
    if (!q || q <= 0) {
      setMsg({ type: 'err', text: 'Quantité invalide.' })
      return
    }
    const kindLabel = exKind === 'casse' ? 'casse' : exKind === 'perte' ? 'perte' : 'don'
    void run(
      () => addEggMovements([{ kind: exKind, qty_eggs: -q, batch_id: exBatch, note: exNote.trim() }], date),
      `Sortie (${kindLabel}) enregistrée.`,
    )
    setExQty('')
    setExNote('')
    setShowExit(false)
  }

  const submitPrice = (e: FormEvent) => {
    e.preventDefault()
    if (!priceForm) return
    const p = parseInt(pPrice, 10)
    if (!p || p < 0) {
      setMsg({ type: 'err', text: 'Prix invalide.' })
      return
    }
    void run(
      () => saveBatchPrice(priceForm.batchId, priceForm.channel, p, pDate, pNote.trim()),
      'Prix enregistré.',
    ).then(() => {
      setPriceForm(null)
      setPPrice('')
      setPNote('')
    })
  }

  const submitEvent = (e: FormEvent) => {
    e.preventDefault()
    if (!evTitle.trim()) {
      setMsg({ type: 'err', text: 'Le titre est obligatoire.' })
      return
    }
    void run(() => addFarmEvent(evDate, evBatch || null, evTitle.trim(), evNote.trim()), 'Événement enregistré.')
      .then(() => {
        setShowEvent(false)
        setEvTitle('')
        setEvNote('')
      })
  }

  /* -------- Prix de revient par plateau (30 derniers jours) -------- */
  const costData = useMemo(() => {
    const since = new Date(`${todayISO()}T00:00:00Z`)
    since.setUTCDate(since.getUTCDate() - 29)
    const sinceStr = since.toISOString().slice(0, 10)
    const expTotal = farm.expenses.filter((x) => x.date >= sinceStr).reduce((n, x) => n + x.amount, 0)
    // Œufs sains produits sur la période, par bande (ponte + casse = sains)
    const sainsByBatch = new Map<string, number>()
    let sainsTotal = 0
    for (const m of farm.eggMovements) {
      if (m.date < sinceStr || m.date > todayISO()) continue
      if (m.kind !== 'ponte' && m.kind !== 'casse') continue
      if (!m.batch_id) continue
      sainsByBatch.set(m.batch_id, (sainsByBatch.get(m.batch_id) ?? 0) + m.qty_eggs)
      sainsTotal += m.qty_eggs
    }
    const traysTotal = sainsTotal / tray
    const perBatch = new Map<string, { expenses: number; trays: number }>()
    for (const x of farm.expenses) {
      if (!x.batch_id || x.date < sinceStr) continue
      const cur = perBatch.get(x.batch_id) ?? { expenses: 0, trays: 0 }
      cur.expenses += x.amount
      perBatch.set(x.batch_id, cur)
    }
    for (const [id, sains] of sainsByBatch) {
      const cur = perBatch.get(id) ?? { expenses: 0, trays: 0 }
      cur.trays = sains / tray
      perBatch.set(id, cur)
    }
    const costPerTray = (expenses: number, traysMade: number) =>
      traysMade > 0 ? Math.round(expenses / traysMade) : null
    return {
      global: costPerTray(expTotal, traysTotal),
      perBatch: new Map(
        [...perBatch.entries()].map(([id, v]) => [id, costPerTray(v.expenses, v.trays)]),
      ),
      expTotal,
      traysTotal,
    }
  }, [farm.expenses, farm.eggMovements, tray])

  const events = farm.farmEvents.slice(0, 30) as FarmEvent[]

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
          {msg.text}
        </p>
      )}

      {/* Saisie de la production du jour */}
      <form onSubmit={submitProduction} className={`${card} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">Production du jour</h2>
          <label className="flex items-center gap-2 text-sm text-bark-soft">
            Date
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} w-auto`} />
          </label>
        </div>
        <p className="text-xs text-bark-soft">
          Par bande : plateaux sains, œufs sains détachés (0 à {tray - 1}) et œufs cassés. La production du jour = sains + cassés.
        </p>
        <div className="space-y-3">
          {layingBatches.length === 0 && (
            <p className="text-sm text-bark-soft">Aucune bande de pondeuses active — créez-en une dans l'onglet Animaux.</p>
          )}
          {layingBatches.map((b) => {
            const r = rowOf(b.id)
            const sains = rowSains(r)
            const casses = parseInt(r.casses, 10) || 0
            const total = sains + casses
            return (
              <div key={b.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full border border-line" style={batchDot(b)} />
                  <p className="font-medium text-bark">{b.name}</p>
                  {b.egg_color && <span className="text-xs text-bark-soft">({b.egg_color})</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className={labelCls}>Plateaux sains</span>
                    <input
                      type="number" min="0" inputMode="numeric"
                      value={r.plateaux}
                      onChange={(e) => setRow(b.id, { plateaux: e.target.value })}
                      className={inputCls} placeholder="0"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Œufs détachés</span>
                    <input
                      type="number" min="0" max={tray - 1} inputMode="numeric"
                      value={r.oeufs}
                      onChange={(e) => setRow(b.id, { oeufs: e.target.value })}
                      className={inputCls} placeholder={`0–${tray - 1}`}
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Œufs cassés</span>
                    <input
                      type="number" min="0" inputMode="numeric"
                      value={r.casses}
                      onChange={(e) => setRow(b.id, { casses: e.target.value })}
                      className={inputCls} placeholder="0"
                    />
                  </label>
                </div>
                {(sains > 0 || casses > 0) && (
                  <p className="mt-2 text-sm font-semibold text-terra-dark">
                    Total : {fmtPlateaux(total, tray)} · {total} œufs
                    <span className="ml-2 font-normal text-bark-soft">
                      (sains : {fmtPlateaux(sains, tray)} · {sains})
                    </span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Enregistrement…' : 'Enregistrer la production'}
        </button>
      </form>

      {/* Stock par bande + sortie */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">Stock par bande</h2>
          <button type="button" className={btnPrimary} onClick={() => { setShowExit((v) => !v); setMsg(null) }}>
            Sortie de stock
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allBatches.map((b) => {
            const eggs = batchStockEggs(farm.eggMovements, b.id)
            return (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-sand/50 px-4 py-3">
                <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-line" style={batchDot(b)} />
                <div>
                  <p className="text-sm font-medium text-bark">{b.name}</p>
                  <p className="text-xs text-bark-soft">
                    {fmtPlateaux(eggs, tray)} · {eggs} œufs sains
                  </p>
                </div>
              </div>
            )
          })}
          {allBatches.length === 0 && (
            <p className="text-sm text-bark-soft">Aucune bande active.</p>
          )}
        </div>

        {showExit && (
          <form onSubmit={submitExit} className="mt-4 space-y-4 rounded-2xl border border-terra/20 p-4">
            <h3 className="font-display text-base font-semibold text-bark">Sortie de stock</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className={labelCls}>Bande</span>
                <select required value={exBatch} onChange={(e) => setExBatch(e.target.value)} className={inputCls}>
                  <option value="">Choisir…</option>
                  {allBatches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Motif</span>
                <select value={exKind} onChange={(e) => setExKind(e.target.value as 'casse' | 'perte' | 'don')} className={inputCls}>
                  <option value="casse">Cassé</option>
                  <option value="perte">Perdu</option>
                  <option value="don">Don</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Quantité (œufs)</span>
                <input type="number" min="1" required value={exQty} onChange={(e) => setExQty(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Note</span>
                <input value={exNote} onChange={(e) => setExNote(e.target.value)} className={inputCls} placeholder="Ex : don à un voisin" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className={btnPrimary}>Enregistrer</button>
              <button type="button" className={btnGhost} onClick={() => setShowExit(false)}>Fermer</button>
            </div>
          </form>
        )}
      </div>

      {/* Prix par bande */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">Prix par bande</h2>
          <p className="text-xs text-bark-soft">Prix en vigueur au {fmtDateFr(todayISO())} — un prix différent peut s'appliquer par canal.</p>
        </div>
        <div className="mt-4 space-y-3">
          {allBatches.map((b) => {
            const pf = priceAt(farm.batchPrices, b.id, 'ferme', todayISO())
            const pb = priceAt(farm.batchPrices, b.id, 'boutique', todayISO())
            const costF = costData.perBatch.get(b.id)
            const costG = costData.global
            return (
              <div key={b.id} className="rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full border border-line" style={batchDot(b)} />
                    <p className="font-medium text-bark">{b.name}</p>
                    {b.caliber && <span className="text-xs text-bark-soft">calibre {b.caliber}</span>}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-bark-soft">
                      Ferme : <strong className="text-bark">{pf ? formatPrice(pf.price_fcfa) : '—'}</strong>
                    </span>
                    <span className="text-bark-soft">
                      Boutique : <strong className="text-bark">{pb ? formatPrice(pb.price_fcfa) : '—'}</strong>
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-bark-soft">
                  <span>
                    Coût de revient / plateau (30 j) :{' '}
                    <strong className="text-bark">
                      {costF != null ? formatPrice(costF) : costG != null ? `~${formatPrice(costG)}` : '—'}
                    </strong>
                    {costF == null && costG != null ? ' (global)' : ''}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-terra-dark hover:underline"
                    onClick={() => {
                      setPriceForm({ batchId: b.id, channel: 'ferme' })
                      setPPrice(pf ? String(pf.price_fcfa) : '')
                      setPDate(todayISO())
                      setPNote('')
                    }}
                  >
                    Changer le prix
                  </button>
                </div>
              </div>
            )
          })}
          {allBatches.length === 0 && (
            <p className="text-sm text-bark-soft">Aucune bande active.</p>
          )}
        </div>

        {/* Formulaire changement de prix */}
        {priceForm && (
          <form onSubmit={submitPrice} className="mt-4 space-y-4 rounded-2xl border border-terra/20 p-4">
            <h3 className="font-display text-base font-semibold text-bark">
              Changer le prix — {batchName(priceForm.batchId)}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className={labelCls}>Canal</span>
                <select
                  value={priceForm.channel}
                  onChange={(e) => setPriceForm({ ...priceForm, channel: e.target.value })}
                  className={inputCls}
                >
                  <option value="ferme">Ferme</option>
                  <option value="boutique">Boutique</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Nouveau prix (FCFA / plateau)</span>
                <input type="number" min="0" required value={pPrice} onChange={(e) => setPPrice(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Date d'effet</span>
                <input type="date" required value={pDate} onChange={(e) => setPDate(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Note</span>
                <input value={pNote} onChange={(e) => setPNote(e.target.value)} className={inputCls} placeholder="Ex : hausse du coût aliment" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className={btnPrimary}>Enregistrer</button>
              <button type="button" className={btnGhost} onClick={() => setPriceForm(null)}>Fermer</button>
            </div>
          </form>
        )}

        {/* Historique des prix */}
        {farm.batchPrices.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                  <th className="py-3 pr-4">Date d'effet</th>
                  <th className="py-3 pr-4">Bande</th>
                  <th className="py-3 pr-4">Canal</th>
                  <th className="py-3 pr-4">Prix</th>
                  <th className="py-3 pr-4">Note</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {farm.batchPrices.slice(0, 50).map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(p.effective_from)}</td>
                    <td className="py-3 pr-4 font-medium text-bark">{batchName(p.batch_id)}</td>
                    <td className="py-3 pr-4 text-bark-soft">{p.channel === 'ferme' ? 'Ferme' : 'Boutique'}</td>
                    <td className="py-3 pr-4 font-semibold text-terra-dark">{formatPrice(p.price_fcfa)}</td>
                    <td className="py-3 pr-4 text-bark-soft">{p.note}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-terra-dark hover:underline"
                        onClick={() => {
                          if (window.confirm('Supprimer ce prix ?')) {
                            void run(() => deleteBatchPrice(p.id), 'Prix supprimé.')
                          }
                        }}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Événements datés */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">Événements</h2>
          <button type="button" className={btnPrimary} onClick={() => { setShowEvent((v) => !v); setMsg(null) }}>
            Ajouter un événement
          </button>
        </div>

        {showEvent && (
          <form onSubmit={submitEvent} className="mt-4 space-y-4 rounded-2xl border border-terra/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className={labelCls}>Date</span>
                <input type="date" required value={evDate} onChange={(e) => setEvDate(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Bande (facultatif)</span>
                <select value={evBatch} onChange={(e) => setEvBatch(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {allBatches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              <label className="block lg:col-span-2">
                <span className={labelCls}>Titre *</span>
                <input required value={evTitle} onChange={(e) => setEvTitle(e.target.value)} className={inputCls} placeholder="Ex : changement de local, vaccin, arrivée de la 3e bande" />
              </label>
              <label className="block sm:col-span-2 lg:col-span-4">
                <span className={labelCls}>Note</span>
                <input value={evNote} onChange={(e) => setEvNote(e.target.value)} className={inputCls} />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className={btnPrimary}>Enregistrer</button>
              <button type="button" className={btnGhost} onClick={() => setShowEvent(false)}>Fermer</button>
            </div>
          </form>
        )}

        {events.length === 0 ? (
          <p className="mt-3 text-sm text-bark-soft">Aucun événement pour le moment.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {events.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sand/50 px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-bark">{ev.title}</span>
                  <span className="ml-2 text-xs text-bark-soft">
                    {fmtDateFr(ev.date)}{ev.batch_id ? ` · ${batchName(ev.batch_id)}` : ''}{ev.note ? ` · ${ev.note}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-terra-dark hover:underline"
                  onClick={() => {
                    if (window.confirm('Supprimer cet événement ?')) {
                      void run(() => deleteFarmEvent(ev.id), 'Événement supprimé.')
                    }
                  }}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Saisies des 14 derniers jours */}
      <div className={card}>
        <h2 className="font-display text-lg font-semibold text-bark">Saisies des 14 derniers jours</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Bande</th>
                <th className="py-3 pr-4">Sains</th>
                <th className="py-3 pr-4">Cassés</th>
                <th className="py-3 pr-4">Production</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {saisies.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-bark-soft">Aucune saisie sur la période.</td>
                </tr>
              )}
              {saisies.map((s) => (
                <tr key={`${s.batch_id}-${s.date}`} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(s.date)}</td>
                  <td className="py-3 pr-4 font-medium text-bark">{batchName(s.batch_id)}</td>
                  <td className="py-3 pr-4">{fmtPlateaux(s.sains, tray)} · {s.sains}</td>
                  <td className="py-3 pr-4 text-terra-dark">{s.casses > 0 ? `−${s.casses}` : '0'}</td>
                  <td className="py-3 pr-4 font-semibold text-bark">{fmtPlateaux(s.total, tray)} · {s.total}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="mr-3 text-xs font-semibold text-bark-soft hover:text-bark hover:underline"
                      onClick={() => editSaisie(s)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-terra-dark hover:underline"
                      onClick={() => deleteSaisie(s)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
