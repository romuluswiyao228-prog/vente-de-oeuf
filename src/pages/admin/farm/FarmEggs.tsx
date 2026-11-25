import { useMemo, useState, type FormEvent } from 'react'
import {
  addEggMovements,
  deleteEggMovement,
  exportCsv,
  fmtDateFr,
  startIncubation,
  todayISO,
  transferEggsToShop,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import type { EggMovementKind, FarmBatch, Product } from '../../../lib/types'
import { EGG_MOVEMENT_KINDS } from '../../../lib/types'

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
  goToIncubation: () => void
}

type Panel = 'none' | 'perte' | 'ajustement' | 'incubation' | 'transfert'

const kindLabel = (k: string) => EGG_MOVEMENT_KINDS.find((x) => x.value === k)?.label ?? k

export default function FarmEggs({ farm, refetch, products, goToIncubation }: Props) {
  const [date, setDate] = useState(todayISO())
  const [batchId, setBatchId] = useState('')
  const [collected, setCollected] = useState('')
  const [broken, setBroken] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Panneaux
  const [panel, setPanel] = useState<Panel>('none')
  const [lossQty, setLossQty] = useState('')
  const [lossNote, setLossNote] = useState('')
  const [adjQty, setAdjQty] = useState('')
  const [adjNote, setAdjNote] = useState('')
  const [incEggs, setIncEggs] = useState('')
  const [incDays, setIncDays] = useState('21')
  const [incNote, setIncNote] = useState('')
  const [trays, setTrays] = useState('1')
  const [trProduct, setTrProduct] = useState('')
  const [trNote, setTrNote] = useState('')

  // Filtres historique
  const [fKind, setFKind] = useState('')
  const [fBatch, setFBatch] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')

  const tray = farm.eggsPerTray
  const batches = farm.batches.filter((b) => b.status === 'actif')
  const eggProducts = products.filter((p) => p.type === 'oeufs')
  const batchName = (id: string | null) =>
    id ? (farm.batches.find((b) => b.id === id)?.name ?? '—') : '—'
  const productName = (id: string | null) =>
    id ? (products.find((p) => p.id === id)?.name ?? '—') : '—'

  // Compteurs
  const stats = useMemo(() => {
    const today = todayISO()
    const weekAgo = new Date(`${today}T00:00:00Z`)
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 6)
    const weekStart = weekAgo.toISOString().slice(0, 10)
    let ponteDay = 0
    let ponteWeek = 0
    for (const m of farm.eggMovements) {
      if (m.kind !== 'ponte') continue
      if (m.date === today) ponteDay += m.qty_eggs
      if (m.date >= weekStart && m.date <= today) ponteWeek += m.qty_eggs
    }
    const reserve = farm.eggReserve
    const traysFull = Math.floor(reserve / tray)
    const rest = reserve % tray
    return { ponteDay, ponteWeek, reserve, traysFull, rest }
  }, [farm.eggMovements, farm.eggReserve, tray])

  const filtered = useMemo(
    () =>
      farm.eggMovements.filter((m) => {
        if (fKind && m.kind !== fKind) return false
        if (fBatch === 'none' && m.batch_id) return false
        if (fBatch && fBatch !== 'none' && m.batch_id !== fBatch) return false
        if (fFrom && m.date < fFrom) return false
        if (fTo && m.date > fTo) return false
        return true
      }),
    [farm.eggMovements, fKind, fBatch, fFrom, fTo],
  )

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

  const submitPonte = (e: FormEvent) => {
    e.preventDefault()
    const laid = parseInt(collected, 10)
    const broke = parseInt(broken, 10) || 0
    if (!laid || laid <= 0) {
      setMsg({ type: 'err', text: 'Indique le nombre d\u2019œufs récoltés.' })
      return
    }
    if (broke < 0 || broke > laid) {
      setMsg({ type: 'err', text: 'Le nombre de cassés doit être compris entre 0 et les récoltés.' })
      return
    }
    const entries: { kind: EggMovementKind; qty_eggs: number; batch_id: string | null }[] = [
      { kind: 'ponte', qty_eggs: laid, batch_id: batchId || null },
    ]
    if (broke > 0) entries.push({ kind: 'casse', qty_eggs: -broke, batch_id: batchId || null })
    void run(() => addEggMovements(entries, date), 'Ponte enregistrée.')
    setCollected('')
    setBroken('')
  }

  const submitPanel = (e: FormEvent) => {
    e.preventDefault()
    const n = parseInt(panel === 'ajustement' ? adjQty : lossQty, 10)
    if (!n || (panel === 'ajustement' ? n === 0 : n <= 0)) {
      setMsg({ type: 'err', text: 'Quantité invalide.' })
      return
    }
    if (panel === 'perte') {
      void run(
        () => addEggMovements([{ kind: 'perte', qty_eggs: -Math.abs(n), batch_id: batchId || null, note: lossNote }], date),
        'Perte enregistrée.',
      )
      setLossQty('')
      setLossNote('')
    } else if (panel === 'ajustement') {
      void run(
        () => addEggMovements([{ kind: 'ajustement', qty_eggs: n, batch_id: batchId || null, note: adjNote }], date),
        'Ajustement enregistré.',
      )
      setAdjQty('')
      setAdjNote('')
    } else if (panel === 'incubation') {
      const eggs = parseInt(incEggs, 10)
      const days = parseInt(incDays, 10) || 21
      if (!eggs || eggs <= 0) {
        setMsg({ type: 'err', text: 'Nombre d\u2019œufs à couver invalide.' })
        return
      }
      void run(
        () => startIncubation(batchId || null, date, eggs, days, incNote),
        'Incubation démarrée — les œufs sont sortis de la réserve.',
      ).then(() => setPanel('none'))
      setIncEggs('')
      setIncNote('')
    } else if (panel === 'transfert') {
      const t = parseInt(trays, 10)
      const eggs = t * tray
      if (!trProduct) {
        setMsg({ type: 'err', text: 'Choisis un produit œufs.' })
        return
      }
      if (!t || t <= 0) {
        setMsg({ type: 'err', text: 'Nombre de plateaux invalide.' })
        return
      }
      if (eggs > stats.reserve) {
        setMsg({ type: 'err', text: `Réserve insuffisante : ${eggs} œufs demandés, ${stats.reserve} en réserve.` })
        return
      }
      void run(
        () => transferEggsToShop(trProduct, eggs, date, trNote),
        `${t} plateau${t > 1 ? 'x' : ''} transféré${t > 1 ? 's' : ''} vers la boutique.`,
      ).then(() => setPanel('none'))
      setTrays('1')
      setTrNote('')
    }
  }

  const exportHistory = () => {
    exportCsv(
      `mouvements-oeufs-${todayISO()}.csv`,
      ['Date', 'Type', 'Quantité', 'Bande', 'Produit', 'Note'],
      filtered.map((m) => [
        m.date,
        kindLabel(m.kind),
        m.qty_eggs,
        batchName(m.batch_id),
        productName(m.product_id),
        m.note,
      ]),
    )
  }

  return (
    <div className="space-y-6">
      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Œufs en réserve', value: `${stats.reserve}` },
          { label: 'Plateaux', value: `${stats.traysFull} + ${stats.rest}` },
          { label: 'Ponte du jour', value: `${stats.ponteDay}` },
          { label: 'Ponte 7 jours', value: `${stats.ponteWeek}` },
        ].map((c) => (
          <div key={c.label} className={card}>
            <p className="text-xs font-semibold uppercase tracking-wider text-bark-soft">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-terra-dark">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Saisie rapide ponte + casse */}
      <form onSubmit={submitPonte} className={`${card} space-y-4`}>
        <h2 className="font-display text-lg font-semibold text-bark">Saisie rapide — ponte du jour</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={labelCls}>Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Bande (facultatif)</span>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {batches.map((b: FarmBatch) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Œufs récoltés</span>
            <input type="number" min="1" inputMode="numeric" required value={collected} onChange={(e) => setCollected(e.target.value)} className={inputCls} placeholder="Ex : 42" />
          </label>
          <label className="block">
            <span className={labelCls}>Œufs cassés</span>
            <input type="number" min="0" inputMode="numeric" value={broken} onChange={(e) => setBroken(e.target.value)} className={inputCls} placeholder="0" />
          </label>
        </div>
        {msg && (
          <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Enregistrement…' : 'Enregistrer la ponte'}
        </button>
      </form>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={() => { setPanel(panel === 'transfert' ? 'none' : 'transfert'); setMsg(null) }}>
          Transférer vers la boutique
        </button>
        <button type="button" className={btnGhost} onClick={() => { setPanel(panel === 'incubation' ? 'none' : 'incubation'); setMsg(null) }}>
          Mettre en incubation
        </button>
        <button type="button" className={btnGhost} onClick={() => { setPanel(panel === 'perte' ? 'none' : 'perte'); setMsg(null) }}>
          Enregistrer une perte
        </button>
        <button type="button" className={btnGhost} onClick={() => { setPanel(panel === 'ajustement' ? 'none' : 'ajustement'); setMsg(null) }}>
          Ajustement
        </button>
      </div>

      {/* Panneau contextuel */}
      {panel !== 'none' && (
        <form onSubmit={submitPanel} className={`${card} space-y-4 border border-terra/20`}>
          <h3 className="font-display text-base font-semibold text-bark">
            {panel === 'transfert' && 'Transférer vers la boutique'}
            {panel === 'incubation' && 'Mettre en incubation'}
            {panel === 'perte' && 'Enregistrer une perte'}
            {panel === 'ajustement' && 'Ajustement de la réserve'}
          </h3>

          {(panel === 'perte' || panel === 'ajustement' || panel === 'incubation') && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelCls}>Date</span>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Bande (facultatif)</span>
                <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {farm.batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              {panel === 'incubation' && (
                <label className="block">
                  <span className={labelCls}>Durée (jours)</span>
                  <input type="number" min="1" max="90" value={incDays} onChange={(e) => setIncDays(e.target.value)} className={inputCls} />
                </label>
              )}
            </div>
          )}

          {panel === 'perte' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Œufs perdus</span>
                <input type="number" min="1" required value={lossQty} onChange={(e) => setLossQty(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Note</span>
                <input value={lossNote} onChange={(e) => setLossNote(e.target.value)} className={inputCls} placeholder="Ex : casse au ramassage" />
              </label>
            </div>
          )}

          {panel === 'ajustement' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Quantité signée (+ entrent, − sortent)</span>
                <input type="number" required value={adjQty} onChange={(e) => setAdjQty(e.target.value)} className={inputCls} placeholder="Ex : -3 ou 12" />
              </label>
              <label className="block">
                <span className={labelCls}>Note (obligatoire)</span>
                <input required value={adjNote} onChange={(e) => setAdjNote(e.target.value)} className={inputCls} placeholder="Pourquoi cet ajustement ?" />
              </label>
            </div>
          )}

          {panel === 'incubation' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Œufs à couver</span>
                <input type="number" min="1" required value={incEggs} onChange={(e) => setIncEggs(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Note</span>
                <input value={incNote} onChange={(e) => setIncNote(e.target.value)} className={inputCls} />
              </label>
            </div>
          )}

          {panel === 'transfert' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelCls}>Produit œufs</span>
                <select required value={trProduct} onChange={(e) => setTrProduct(e.target.value)} className={inputCls}>
                  <option value="">Choisir…</option>
                  {eggProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock : {p.stock})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Nombre de plateaux ({tray} œufs/plateau)</span>
                <input type="number" min="1" required value={trays} onChange={(e) => setTrays(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Note</span>
                <input value={trNote} onChange={(e) => setTrNote(e.target.value)} className={inputCls} />
              </label>
            </div>
          )}

          {panel === 'incubation' && (
            <button type="button" className={btnGhost} onClick={goToIncubation}>
              Gérer les incubations
            </button>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className={btnGhost} onClick={() => setPanel('none')}>
              Fermer
            </button>
          </div>
        </form>
      )}

      {/* Historique */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">Historique des mouvements</h2>
          <button type="button" className={btnGhost} onClick={exportHistory}>
            Export CSV
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select value={fKind} onChange={(e) => setFKind(e.target.value)} className={inputCls} aria-label="Type">
            <option value="">Tous les types</option>
            {EGG_MOVEMENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <select value={fBatch} onChange={(e) => setFBatch(e.target.value)} className={inputCls} aria-label="Bande">
            <option value="">Tous les lots</option>
            <option value="none">Sans bande</option>
            {farm.batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={inputCls} aria-label="Du" />
          <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={inputCls} aria-label="Au" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Qté</th>
                <th className="py-3 pr-4">Bande</th>
                <th className="py-3 pr-4">Produit</th>
                <th className="py-3 pr-4">Note</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-bark-soft">
                    Aucun mouvement.
                  </td>
                </tr>
              )}
              {filtered.slice(0, 200).map((m) => (
                <tr key={m.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(m.date)}</td>
                  <td className="py-3 pr-4 font-medium text-bark">{kindLabel(m.kind)}</td>
                  <td className={`py-3 pr-4 font-semibold ${m.qty_eggs >= 0 ? 'text-leaf-dark' : 'text-terra-dark'}`}>
                    {m.qty_eggs > 0 ? `+${m.qty_eggs}` : m.qty_eggs}
                  </td>
                  <td className="py-3 pr-4 text-bark-soft">{batchName(m.batch_id)}</td>
                  <td className="py-3 pr-4 text-bark-soft">{productName(m.product_id)}</td>
                  <td className="py-3 pr-4 text-bark-soft">{m.note}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="text-xs font-semibold text-terra-dark hover:underline"
                      onClick={() => {
                        if (window.confirm('Supprimer ce mouvement ? La réserve sera recalculée.')) {
                          void run(() => deleteEggMovement(m.id), 'Mouvement supprimé.')
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
      </div>
    </div>
  )
}
