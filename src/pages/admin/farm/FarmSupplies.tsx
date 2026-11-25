import { useMemo, useState, type FormEvent } from 'react'
import {
  addSupplyMovement,
  deleteSupply,
  deleteSupplyMovement,
  exportCsv,
  fmtDateFr,
  saveSupply,
  todayISO,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import type { FarmSupply, Product, SupplyCategory } from '../../../lib/types'
import { SUPPLY_CATEGORIES } from '../../../lib/types'

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

const catLabel = (c: string) => SUPPLY_CATEGORIES.find((x) => x.value === c)?.label ?? c
const EXPENSE_CAT_FOR_SUPPLY: Record<SupplyCategory, string> = {
  aliment: 'aliment',
  medicament: 'soins',
  vaccin: 'soins',
  materiel: 'autre',
}

interface SupplyForm {
  id?: string
  name: string
  category: SupplyCategory
  unit: string
  alert_threshold: string
  expiry_date: string
  note: string
}

const emptyForm: SupplyForm = { name: '', category: 'aliment', unit: 'unité', alert_threshold: '', expiry_date: '', note: '' }

export default function FarmSupplies({ farm, refetch }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SupplyForm | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Mouvement
  const [mvSupply, setMvSupply] = useState<string | null>(null)
  const [mvKind, setMvKind] = useState<'entree' | 'sortie'>('entree')
  const [mvDate, setMvDate] = useState(todayISO())
  const [mvQty, setMvQty] = useState('')
  const [mvCost, setMvCost] = useState('')
  const [mvNote, setMvNote] = useState('')
  const [mvExpense, setMvExpense] = useState(true)

  // Filtres historique
  const [hSupply, setHSupply] = useState('')

  const supplies = farm.supplies
  const grouped = useMemo(() => {
    const map = new Map<SupplyCategory, FarmSupply[]>()
    for (const s of supplies) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return SUPPLY_CATEGORIES.map((c) => ({ ...c, items: map.get(c.value) ?? [] })).filter((g) => g.items.length > 0)
  }, [supplies])

  const supplyName = (id: string) => supplies.find((s) => s.id === id)?.name ?? '—'

  const filteredMovements = useMemo(
    () => farm.supplyMovements.filter((m) => !hSupply || m.supply_id === hSupply),
    [farm.supplyMovements, hSupply],
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

  const openCreate = () => {
    setEditing({ ...emptyForm })
    setShowForm(true)
    setMsg(null)
  }

  const openEdit = (s: FarmSupply) => {
    setEditing({
      id: s.id,
      name: s.name,
      category: s.category,
      unit: s.unit,
      alert_threshold: s.alert_threshold != null ? String(s.alert_threshold) : '',
      expiry_date: s.expiry_date ?? '',
      note: s.note,
    })
    setShowForm(true)
    setMsg(null)
  }

  const submitSupply = (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editing.name.trim()) {
      setMsg({ type: 'err', text: 'Le nom est obligatoire.' })
      return
    }
    void run(
      () =>
        saveSupply({
          id: editing.id,
          name: editing.name.trim(),
          category: editing.category,
          unit: editing.unit.trim() || 'unité',
          alert_threshold: editing.alert_threshold.trim() ? parseFloat(editing.alert_threshold) : null,
          expiry_date: editing.expiry_date || null,
          note: editing.note.trim(),
        }),
      editing.id ? 'Article modifié.' : 'Article créé.',
    ).then(() => setShowForm(false))
  }

  const submitMovement = (e: FormEvent) => {
    e.preventDefault()
    if (!mvSupply) {
      setMsg({ type: 'err', text: 'Choisis un article.' })
      return
    }
    const qty = parseFloat(mvQty)
    if (!qty || qty <= 0) {
      setMsg({ type: 'err', text: 'Quantité invalide.' })
      return
    }
    const supply = supplies.find((s) => s.id === mvSupply)
    const signed = mvKind === 'entree' ? qty : -qty
    const cost = mvCost.trim() ? parseFloat(mvCost) : null
    const amount = cost != null ? Math.round(cost * qty) : 0
    void run(
      () =>
        addSupplyMovement(
          mvSupply,
          mvDate,
          signed,
          mvNote.trim(),
          mvKind === 'entree' ? cost : null,
          mvKind === 'entree' && mvExpense && amount > 0 && supply
            ? { category: EXPENSE_CAT_FOR_SUPPLY[supply.category], amount }
            : null,
        ),
      mvKind === 'entree' ? 'Entrée enregistrée.' : 'Sortie enregistrée.',
    ).then(() => {
      setMvSupply(null)
      setMvQty('')
      setMvCost('')
      setMvNote('')
    })
  }

  const exportSupplies = () => {
    exportCsv(
      `approvisionnements-${todayISO()}.csv`,
      ['Article', 'Catégorie', 'Stock', 'Unité', 'Seuil', 'Péremption', 'Note'],
      supplies.map((s) => [
        s.name,
        catLabel(s.category),
        s.stock ?? 0,
        s.unit,
        s.alert_threshold ?? '',
        s.expiry_date ?? '',
        s.note,
      ]),
    )
  }

  const exportMovements = () => {
    exportCsv(
      `mouvements-stock-${todayISO()}.csv`,
      ['Date', 'Article', 'Quantité', 'Coût unit.', 'Note'],
      filteredMovements.map((m) => [
        m.date,
        supplyName(m.supply_id),
        m.qty,
        m.unit_cost ?? '',
        m.note,
      ]),
    )
  }

  const stockAlert = (s: FarmSupply) =>
    s.alert_threshold != null && (s.stock ?? 0) <= s.alert_threshold
  const expiryAlert = (s: FarmSupply) =>
    s.expiry_date != null && s.expiry_date <= (() => { const d = new Date(`${todayISO()}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 14); return d.toISOString().slice(0, 10) })()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-bark">Approvisionnements</h2>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={exportSupplies}>Export articles CSV</button>
          <button type="button" className={btnPrimary} onClick={openCreate}>Nouvel article</button>
        </div>
      </div>

      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
          {msg.text}
        </p>
      )}

      {showForm && editing && (
        <form onSubmit={submitSupply} className={`${card} space-y-4 border border-terra/20`}>
          <h3 className="font-display text-base font-semibold text-bark">
            {editing.id ? 'Modifier l\u2019article' : 'Nouvel article'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Nom *</span>
              <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} placeholder="Ex : Granulés couche" />
            </label>
            <label className="block">
              <span className={labelCls}>Catégorie</span>
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as SupplyCategory })} className={inputCls}>
                {SUPPLY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Unité</span>
              <input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} className={inputCls} placeholder="sac, kg, flacon…" />
            </label>
            <label className="block">
              <span className={labelCls}>Seuil d'alerte</span>
              <input type="number" min="0" step="any" value={editing.alert_threshold} onChange={(e) => setEditing({ ...editing, alert_threshold: e.target.value })} className={inputCls} placeholder="Ex : 5" />
            </label>
            <label className="block">
              <span className={labelCls}>Date de péremption</span>
              <input type="date" value={editing.expiry_date} onChange={(e) => setEditing({ ...editing, expiry_date: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Note</span>
              <input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} className={inputCls} />
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className={btnGhost} onClick={() => setShowForm(false)}>Fermer</button>
          </div>
        </form>
      )}

      {/* Par catégorie */}
      {grouped.map((g) => (
        <div key={g.value} className={card}>
          <h3 className="font-display text-base font-semibold text-bark">{g.label}</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                  <th className="py-3 pr-4">Article</th>
                  <th className="py-3 pr-4">Stock</th>
                  <th className="py-3 pr-4">Seuil</th>
                  <th className="py-3 pr-4">Péremption</th>
                  <th className="py-3 pr-4">Note</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {g.items.map((s) => (
                  <tr key={s.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3 pr-4 font-medium text-bark">{s.name}</td>
                    <td className={`py-3 pr-4 font-semibold ${stockAlert(s) ? 'text-terra-dark' : 'text-bark'}`}>
                      {s.stock ?? 0} {s.unit}
                      {stockAlert(s) && <span className="ml-1 text-xs">⚠</span>}
                    </td>
                    <td className="py-3 pr-4 text-bark-soft">{s.alert_threshold ?? '—'}</td>
                    <td className={`py-3 pr-4 ${expiryAlert(s) ? 'font-semibold text-terra-dark' : 'text-bark-soft'}`}>
                      {s.expiry_date ? fmtDateFr(s.expiry_date) : '—'}
                      {expiryAlert(s) && <span className="ml-1 text-xs">⚠</span>}
                    </td>
                    <td className="py-3 pr-4 text-bark-soft">{s.note}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" className={btnGhost} onClick={() => { setMvSupply(s.id); setMvKind('entree'); setMsg(null) }}>
                          Entrée
                        </button>
                        <button type="button" className={btnGhost} onClick={() => { setMvSupply(s.id); setMvKind('sortie'); setMsg(null) }}>
                          Sortie
                        </button>
                        <button type="button" className="text-xs font-semibold text-bark-soft hover:text-bark" onClick={() => openEdit(s)}>
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-terra-dark hover:underline"
                          onClick={() => {
                            if (window.confirm(`Supprimer « ${s.name} » et tout son historique ?`)) {
                              void run(() => deleteSupply(s.id), 'Article supprimé.')
                            }
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {supplies.length === 0 && (
        <p className={`${card} text-center text-sm text-bark-soft`}>Aucun article pour le moment.</p>
      )}

      {/* Mouvement entrée / sortie */}
      {mvSupply && (
        <form onSubmit={submitMovement} className={`${card} space-y-4 border border-terra/20`}>
          <h3 className="font-display text-base font-semibold text-bark">
            {mvKind === 'entree' ? 'Entrée de stock' : 'Sortie de stock'} — {supplies.find((s) => s.id === mvSupply)?.name}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={labelCls}>Date</span>
              <input type="date" required value={mvDate} onChange={(e) => setMvDate(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Quantité</span>
              <input type="number" min="0" step="any" required value={mvQty} onChange={(e) => setMvQty(e.target.value)} className={inputCls} />
            </label>
            {mvKind === 'entree' && (
              <label className="block">
                <span className={labelCls}>Coût unitaire (FCFA)</span>
                <input type="number" min="0" step="any" value={mvCost} onChange={(e) => setMvCost(e.target.value)} className={inputCls} placeholder="Facultatif" />
              </label>
            )}
            <label className="block">
              <span className={labelCls}>Note</span>
              <input value={mvNote} onChange={(e) => setMvNote(e.target.value)} className={inputCls} placeholder="Ex : achat marché" />
            </label>
          </div>
          {mvKind === 'entree' && (
            <label className="flex items-center gap-2 text-sm text-bark">
              <input type="checkbox" checked={mvExpense} onChange={(e) => setMvExpense(e.target.checked)} className="accent-terra" />
              Créer la dépense associée
            </label>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className={btnGhost} onClick={() => setMvSupply(null)}>Fermer</button>
          </div>
        </form>
      )}

      {/* Historique des mouvements */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-bark">Mouvements de stock</h3>
          <button type="button" className={btnGhost} onClick={exportMovements}>Export CSV</button>
        </div>
        <select value={hSupply} onChange={(e) => setHSupply(e.target.value)} className={`${inputCls} mt-4 sm:max-w-xs`} aria-label="Filtrer par article">
          <option value="">Tous les articles</option>
          {supplies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Article</th>
                <th className="py-3 pr-4">Qté</th>
                <th className="py-3 pr-4">Coût unit.</th>
                <th className="py-3 pr-4">Note</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-bark-soft">Aucun mouvement.</td>
                </tr>
              )}
              {filteredMovements.slice(0, 200).map((m) => (
                <tr key={m.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(m.date)}</td>
                  <td className="py-3 pr-4 font-medium text-bark">{supplyName(m.supply_id)}</td>
                  <td className={`py-3 pr-4 font-semibold ${m.qty >= 0 ? 'text-leaf-dark' : 'text-terra-dark'}`}>
                    {m.qty > 0 ? `+${m.qty}` : m.qty}
                  </td>
                  <td className="py-3 pr-4 text-bark-soft">{m.unit_cost != null ? `${m.unit_cost} F` : '—'}</td>
                  <td className="py-3 pr-4 text-bark-soft">{m.note}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="text-xs font-semibold text-terra-dark hover:underline"
                      onClick={() => {
                        if (window.confirm('Supprimer ce mouvement ? Le stock sera recalculé.')) {
                          void run(() => deleteSupplyMovement(m.id), 'Mouvement supprimé.')
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
