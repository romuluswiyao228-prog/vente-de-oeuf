import { useMemo, useState, type FormEvent } from 'react'
import {
  createSale,
  deleteSale,
  fmtDateFr,
  fmtPlateaux,
  priceAt,
  saleLineAmount,
  saleLineEggs,
  saleStatus,
  todayISO,
  updateSale,
  type SaleLineInput,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import { formatPrice } from '../../../lib/store'
import type { FarmBatch, FarmSale, FarmSaleLine, Product } from '../../../lib/types'
import { SALE_CHANNELS } from '../../../lib/types'

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

/** Ligne de saisie côté formulaire (chaînes pour les inputs). */
interface FormLine {
  batch_id: string
  plateaux: string
  oeufs: string
  unit_price: string
}

const statusLabel = (s: FarmSale) => {
  const st = saleStatus(s)
  return st === 'payee' ? 'Payée' : st === 'partielle' ? 'Partielle' : 'À payer'
}
const statusCls = (s: FarmSale) => {
  const st = saleStatus(s)
  return st === 'payee'
    ? 'bg-leaf-soft text-leaf-dark'
    : st === 'partielle'
      ? 'bg-sand text-bark'
      : 'bg-terra-soft/60 text-terra-dark'
}

export default function FarmSales({ farm, refetch }: Props) {
  const tray = farm.eggsPerTray
  const batches = farm.batches.filter((b) => b.status === 'actif')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [force, setForce] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Formulaire vente
  const [fDate, setFDate] = useState(todayISO())
  const [fClient, setFClient] = useState('')
  const [fChannel, setFChannel] = useState('ferme')
  const [fLines, setFLines] = useState<FormLine[]>([{ batch_id: '', plateaux: '', oeufs: '', unit_price: '' }])
  const [fPaidAll, setFPaidAll] = useState(true)
  const [fPaidAmount, setFPaidAmount] = useState('')
  const [fNote, setFNote] = useState('')

  // Rapport journalier
  const [reportDate, setReportDate] = useState(todayISO())

  const batchName = (id: string | null) =>
    id ? (farm.batches.find((b) => b.id === id)?.name ?? '—') : 'Client de passage'

  const saleLines = (saleId: string) => farm.saleLines.filter((l) => l.sale_id === saleId)

  const toInput = (l: FormLine): SaleLineInput | null => {
    if (!l.batch_id) return null
    return {
      batch_id: l.batch_id,
      plateaux: parseInt(l.plateaux, 10) || 0,
      oeufs: parseInt(l.oeufs, 10) || 0,
      unit_price: parseInt(l.unit_price, 10) || 0,
    }
  }

  const formTotal = fLines.reduce((n, l) => {
    const i = toInput(l)
    return i ? n + saleLineAmount(i, tray) : n
  }, 0)

  const setLine = (i: number, patch: Partial<FormLine>) =>
    setFLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  /** Pré-remplit le prix unitaire depuis le prix en vigueur de la bande et du canal. */
  const prefillPrice = (batchId: string, channel: string, lineIdx: number) => {
    const p = priceAt(farm.batchPrices, batchId, channel, fDate)
    if (p) setLine(lineIdx, { unit_price: String(p.price_fcfa) })
  }

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

  const resetForm = () => {
    setEditingId(null)
    setFDate(todayISO())
    setFClient('')
    setFChannel('ferme')
    setFLines([{ batch_id: '', plateaux: '', oeufs: '', unit_price: '' }])
    setFPaidAll(true)
    setFPaidAmount('')
    setFNote('')
    setForce(false)
  }

  const openEdit = (s: FarmSale) => {
    const lines = saleLines(s.id)
    setEditingId(s.id)
    setFDate(s.date)
    setFClient(s.client_id ?? '')
    setFChannel(s.channel)
    setFLines(
      lines.length > 0
        ? lines.map((l: FarmSaleLine) => ({
            batch_id: l.batch_id,
            plateaux: String(l.plateaux),
            oeufs: String(l.oeufs),
            unit_price: String(l.unit_price),
          }))
        : [{ batch_id: '', plateaux: '', oeufs: '', unit_price: '' }],
    )
    setFPaidAll(s.paid_amount >= s.total_fcfa)
    setFPaidAmount(s.paid_amount > 0 && s.paid_amount < s.total_fcfa ? String(s.paid_amount) : '')
    setFNote(s.note)
    setForce(false)
    setShowForm(true)
    setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Si le serveur refuse pour stock insuffisant, propose « Enregistrer quand même ». */
  const onSaleError = (err: unknown) => {
    const text = err instanceof Error ? err.message : String(err)
    if (/stock insuffisant/i.test(text) && !force) {
      setForce(true)
      setMsg({ type: 'err', text: `${text} Coche « Enregistrer quand même » pour forcer.` })
    } else {
      setMsg({ type: 'err', text })
    }
  }

  const submitSale = (e: FormEvent) => {
    e.preventDefault()
    const lines = fLines.map(toInput).filter((l): l is SaleLineInput => l !== null)
    if (lines.length === 0) {
      setMsg({ type: 'err', text: 'Ajoute au moins une ligne avec une bande.' })
      return
    }
    for (const l of lines) {
      if (!l.plateaux && !l.oeufs) {
        setMsg({ type: 'err', text: 'Chaque ligne doit contenir des plateaux ou des œufs.' })
        return
      }
      if (l.oeufs < 0 || l.oeufs >= tray) {
        setMsg({ type: 'err', text: `Œufs détachés : entre 0 et ${tray - 1} par ligne.` })
        return
      }
    }
    const paid = fPaidAll ? formTotal : parseInt(fPaidAmount, 10) || 0
    if (paid > formTotal) {
      setMsg({ type: 'err', text: 'Le montant payé dépasse le total.' })
      return
    }
    setBusy(true)
    setMsg(null)
    const clientId = fClient || null
    const fn = editingId
      ? () => updateSale(editingId, fDate, clientId, fChannel, paid, fNote.trim(), lines, force)
      : () => createSale(fDate, clientId, fChannel, paid, fNote.trim(), lines, force)
    fn()
      .then(() => {
        setMsg({ type: 'ok', text: editingId ? 'Vente modifiée.' : 'Vente enregistrée.' })
        refetch()
        setShowForm(false)
        resetForm()
      })
      .catch((err) => onSaleError(err))
      .finally(() => setBusy(false))
  }

  const removeSale = (s: FarmSale) => {
    if (!window.confirm(`Supprimer la vente du ${fmtDateFr(s.date)} (${batchName(s.client_id)}, ${formatPrice(s.total_fcfa)}) ? Les œufs vendus retourneront en stock.`)) return
    void run(() => deleteSale(s.id), 'Vente supprimée — les œufs sont revenus en stock.')
  }

  /* ------------------------- Rapport journalier ------------------------- */
  const report = useMemo(() => {
    const daySales = farm.sales.filter((s) => s.date === reportDate)
    const byBatch = new Map<string, { plateaux: number; oeufs: number; amount: number }>()
    let total = 0
    let paid = 0
    for (const s of daySales) {
      total += s.total_fcfa
      paid += s.paid_amount
      for (const l of farm.saleLines.filter((x) => x.sale_id === s.id)) {
        const cur = byBatch.get(l.batch_id) ?? { plateaux: 0, oeufs: 0, amount: 0 }
        cur.plateaux += l.plateaux
        cur.oeufs += l.oeufs
        cur.amount += saleLineAmount(l, tray)
        byBatch.set(l.batch_id, cur)
      }
    }
    const exits = farm.eggMovements.filter(
      (m) => m.date === reportDate && ['casse', 'perte', 'don', 'vente'].includes(m.kind),
    )
    return { daySales, byBatch, total, paid, exits }
  }, [farm.sales, farm.saleLines, farm.eggMovements, reportDate, tray])

  const unpaid = farm.sales
    .filter((s) => saleStatus(s) !== 'payee')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const unpaidTotal = unpaid.reduce((n, s) => n + Math.max(0, s.total_fcfa - s.paid_amount), 0)

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
          {msg.text}
        </p>
      )}

      {/* À encaisser */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">À encaisser</h2>
          <p className="text-sm">
            <span className="text-bark-soft">Total restant : </span>
            <strong className={unpaidTotal > 0 ? 'text-terra-dark' : 'text-leaf-dark'}>{formatPrice(unpaidTotal)}</strong>
          </p>
        </div>
        {unpaid.length === 0 ? (
          <p className="mt-3 text-sm text-bark-soft">Toutes les ventes sont payées.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Client</th>
                  <th className="py-3 pr-4">Canal</th>
                  <th className="py-3 pr-4">Total</th>
                  <th className="py-3 pr-4">Payé</th>
                  <th className="py-3 pr-4">Reste</th>
                  <th className="py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((s) => (
                  <tr key={s.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(s.date)}</td>
                    <td className="py-3 pr-4 font-medium text-bark">{batchName(s.client_id)}</td>
                    <td className="py-3 pr-4 text-bark-soft">{s.channel === 'ferme' ? 'Ferme' : 'Boutique'}</td>
                    <td className="py-3 pr-4">{formatPrice(s.total_fcfa)}</td>
                    <td className="py-3 pr-4 text-leaf-dark">{formatPrice(s.paid_amount)}</td>
                    <td className="py-3 pr-4 font-semibold text-terra-dark">{formatPrice(s.total_fcfa - s.paid_amount)}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls(s)}`}>{statusLabel(s)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Saisie vente */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-bark">{editingId ? 'Modifier la vente' : 'Nouvelle vente'}</h2>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            if (showForm) {
              setShowForm(false)
              resetForm()
            } else {
              resetForm()
              setShowForm(true)
            }
            setMsg(null)
          }}
        >
          {showForm ? 'Fermer' : 'Nouvelle vente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitSale} className={`${card} space-y-4 border border-terra/20`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={labelCls}>Date</span>
              <input type="date" required value={fDate} onChange={(e) => setFDate(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Client</span>
              <select value={fClient} onChange={(e) => setFClient(e.target.value)} className={inputCls}>
                <option value="">Client de passage</option>
                {farm.farmClients.filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Canal</span>
              <select
                value={fChannel}
                onChange={(e) => {
                  setFChannel(e.target.value)
                  // Re-pré-remplit les prix vides selon le nouveau canal
                  setFLines((ls) =>
                    ls.map((l) => {
                      if (!l.batch_id || l.unit_price) return l
                      const p = priceAt(farm.batchPrices, l.batch_id, e.target.value, fDate)
                      return p ? { ...l, unit_price: String(p.price_fcfa) } : l
                    }),
                  )
                }}
                className={inputCls}
              >
                {SALE_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Note</span>
              <input value={fNote} onChange={(e) => setFNote(e.target.value)} className={inputCls} />
            </label>
          </div>

          {/* Lignes */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-bark">Lignes de la vente</p>
            {fLines.map((l, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 rounded-2xl border border-line p-3 sm:grid-cols-5">
                <label className="block col-span-2 sm:col-span-1">
                  <span className={labelCls}>Bande</span>
                  <select
                    value={l.batch_id}
                    onChange={(e) => {
                      setLine(i, { batch_id: e.target.value })
                      prefillPrice(e.target.value, fChannel, i)
                    }}
                    className={inputCls}
                  >
                    <option value="">Choisir…</option>
                    {batches.map((b: FarmBatch) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelCls}>Plateaux</span>
                  <input type="number" min="0" inputMode="numeric" value={l.plateaux} onChange={(e) => setLine(i, { plateaux: e.target.value })} className={inputCls} placeholder="0" />
                </label>
                <label className="block">
                  <span className={labelCls}>Œufs</span>
                  <input type="number" min="0" max={tray - 1} inputMode="numeric" value={l.oeufs} onChange={(e) => setLine(i, { oeufs: e.target.value })} className={inputCls} placeholder={`0–${tray - 1}`} />
                </label>
                <label className="block">
                  <span className={labelCls}>Prix / plateau</span>
                  <input type="number" min="0" inputMode="numeric" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} className={inputCls} placeholder="FCFA" />
                </label>
                <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-1">
                  {l.batch_id && (parseInt(l.plateaux, 10) || parseInt(l.oeufs, 10)) ? (
                    <span className="text-xs text-bark-soft">
                      {saleLineEggs({ plateaux: parseInt(l.plateaux, 10) || 0, oeufs: parseInt(l.oeufs, 10) || 0 }, tray)} œufs
                    </span>
                  ) : <span />}
                  {fLines.length > 1 && (
                    <button type="button" className="text-xs font-semibold text-terra-dark hover:underline" onClick={() => setFLines((ls) => ls.filter((_, j) => j !== i))}>
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className={btnGhost}
              onClick={() => setFLines((ls) => [...ls, { batch_id: '', plateaux: '', oeufs: '', unit_price: '' }])}
            >
              + Ajouter une ligne
            </button>
          </div>

          {/* Paiement */}
          <div className="grid gap-4 rounded-2xl bg-sand/50 p-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium text-bark">
              <input type="checkbox" checked={fPaidAll} onChange={(e) => setFPaidAll(e.target.checked)} className="h-4 w-4 accent-terra" />
              Payé en totalité
            </label>
            {!fPaidAll && (
              <label className="block">
                <span className={labelCls}>Montant payé (FCFA)</span>
                <input type="number" min="0" value={fPaidAmount} onChange={(e) => setFPaidAmount(e.target.value)} className={inputCls} placeholder="0" />
              </label>
            )}
            <p className="text-sm sm:col-span-2">
              <span className="text-bark-soft">Total : </span>
              <strong className="font-display text-lg text-terra-dark">{formatPrice(formTotal)}</strong>
            </p>
          </div>

          {force && (
            <label className="flex items-center gap-2 text-sm font-medium text-terra-dark">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="h-4 w-4 accent-terra" />
              Enregistrer quand même (stock insuffisant)
            </label>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Enregistrer la vente'}
            </button>
            <button type="button" className={btnGhost} onClick={() => { setShowForm(false); resetForm() }}>Fermer</button>
          </div>
        </form>
      )}

      {/* Liste des ventes */}
      <div className={card}>
        <h2 className="font-display text-lg font-semibold text-bark">Ventes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Canal</th>
                <th className="py-3 pr-4">Lignes</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Payé</th>
                <th className="py-3 pr-4">Statut</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {farm.sales.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-bark-soft">Aucune vente.</td></tr>
              )}
              {farm.sales.map((s) => {
                const lines = saleLines(s.id)
                const eggs = lines.reduce((n, l) => n + saleLineEggs(l, tray), 0)
                return (
                  <tr key={s.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(s.date)}</td>
                    <td className="py-3 pr-4 font-medium text-bark">{batchName(s.client_id)}</td>
                    <td className="py-3 pr-4 text-bark-soft">{s.channel === 'ferme' ? 'Ferme' : 'Boutique'}</td>
                    <td className="py-3 pr-4 text-bark-soft">
                      {lines.map((l) => `${l.plateaux}P${l.oeufs > 0 ? l.oeufs : ''} ${farm.batches.find((b) => b.id === l.batch_id)?.name ?? ''}`).join(', ') || '—'}
                      <span className="block text-xs">{fmtPlateaux(eggs, tray)} · {eggs} œufs</span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-bark">{formatPrice(s.total_fcfa)}</td>
                    <td className="py-3 pr-4 text-leaf-dark">{formatPrice(s.paid_amount)}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls(s)}`}>{statusLabel(s)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <button type="button" className="mr-3 text-xs font-semibold text-bark-soft hover:text-bark hover:underline" onClick={() => openEdit(s)}>
                        Modifier
                      </button>
                      <button type="button" className="text-xs font-semibold text-terra-dark hover:underline" onClick={() => removeSale(s)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rapport journalier */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">Rapport du jour</h2>
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className={`${inputCls} w-auto`} aria-label="Date du rapport" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-sand/60 p-4 text-center">
            <p className="text-xs uppercase text-bark-soft">Ventes du jour</p>
            <p className="font-display text-xl font-semibold text-bark">{report.daySales.length}</p>
          </div>
          <div className="rounded-2xl bg-sand/60 p-4 text-center">
            <p className="text-xs uppercase text-bark-soft">Montant</p>
            <p className="font-display text-xl font-semibold text-bark">{formatPrice(report.total)}</p>
          </div>
          <div className="rounded-2xl bg-sand/60 p-4 text-center">
            <p className="text-xs uppercase text-bark-soft">Encaissé / Restant</p>
            <p className="font-display text-xl font-semibold text-leaf-dark">{formatPrice(report.paid)}</p>
            <p className="text-xs text-terra-dark">reste {formatPrice(Math.max(0, report.total - report.paid))}</p>
          </div>
        </div>

        {/* Ventes par bande */}
        <h3 className="mt-5 font-display text-base font-semibold text-bark">Par bande</h3>
        {report.byBatch.size === 0 ? (
          <p className="mt-2 text-sm text-bark-soft">Aucune vente ce jour.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                  <th className="py-3 pr-4">Bande</th>
                  <th className="py-3 pr-4">Plateaux</th>
                  <th className="py-3 pr-4">Œufs détachés</th>
                  <th className="py-3 pr-4">Total œufs</th>
                  <th className="py-3">Montant</th>
                </tr>
              </thead>
              <tbody>
                {[...report.byBatch.entries()].map(([batchId, v]) => {
                  const eggs = v.plateaux * tray + v.oeufs
                  return (
                    <tr key={batchId} className="border-b border-line/60 last:border-0">
                      <td className="py-3 pr-4 font-medium text-bark">{farm.batches.find((b) => b.id === batchId)?.name ?? '—'}</td>
                      <td className="py-3 pr-4">{v.plateaux}</td>
                      <td className="py-3 pr-4">{v.oeufs}</td>
                      <td className="py-3 pr-4">{fmtPlateaux(eggs, tray)} · {eggs}</td>
                      <td className="py-3 font-semibold text-terra-dark">{formatPrice(v.amount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sorties sans argent */}
        <h3 className="mt-5 font-display text-base font-semibold text-bark">Sorties sans argent</h3>
        {report.exits.length === 0 ? (
          <p className="mt-2 text-sm text-bark-soft">Aucune sortie ce jour.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {report.exits.map((m) => (
              <li key={m.id} className="flex flex-wrap gap-2 text-bark-soft">
                <span className="font-medium text-bark">
                  {m.kind === 'casse' ? 'Cassé' : m.kind === 'perte' ? 'Perdu' : m.kind === 'don' ? 'Don' : 'Vendu'}
                </span>
                <span>{fmtPlateaux(Math.abs(m.qty_eggs), tray)} · {Math.abs(m.qty_eggs)} œufs</span>
                <span>— {m.batch_id ? batchName(m.batch_id) : 'Réserve'}</span>
                {m.note && <span className="italic">({m.note})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
