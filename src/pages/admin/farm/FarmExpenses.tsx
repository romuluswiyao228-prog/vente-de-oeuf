import { useMemo, useState, type FormEvent } from 'react'
import {
  addExpense,
  addTask,
  deleteExpense,
  deleteExpenseCategory,
  exportCsv,
  fmtDateFr,
  saveExpenseCategory,
  todayISO,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import { formatPrice } from '../../../lib/store'
import type { FarmExpense, Product } from '../../../lib/types'
import { EXPENSE_CATEGORIES } from '../../../lib/types'

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

/** Anciennes valeurs techniques → libellé ; les noms du catalogue sont déjà des libellés. */
const catLabel = (c: string) => EXPENSE_CATEGORIES.find((x) => x.value === c)?.label ?? c

function nextRecurringDate(base: string, recurrence: 'hebdo' | 'mensuel'): string {
  const d = new Date(base + 'T12:00:00')
  if (recurrence === 'hebdo') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export default function FarmExpenses({ farm, refetch }: Props) {
  const [date, setDate] = useState(todayISO())
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [batchId, setBatchId] = useState('')
  const [supplyId, setSupplyId] = useState('')
  const [recurrence, setRecurrence] = useState<'' | 'hebdo' | 'mensuel'>('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [showCats, setShowCats] = useState(false)
  const [newCat, setNewCat] = useState('')

  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fCat, setFCat] = useState('')

  const catalog = farm.expenseCategories
  const activeCats = useMemo(() => catalog.filter((c) => c.active), [catalog])

  /** Options du menu : catalogue actif + valeurs déjà présentes dans les dépenses. */
  const categoryOptions = useMemo(() => {
    const names = activeCats.map((c) => c.name)
    const extra = [...new Set(farm.expenses.map((e) => e.category))].filter(
      (c) => !names.includes(c) && !catalog.some((k) => k.name === c),
    )
    return [...names, ...extra].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [activeCats, catalog, farm.expenses])

  const filterOptions = useMemo(() => {
    const names = catalog.map((c) => c.name)
    const extra = [...new Set(farm.expenses.map((e) => e.category))].filter((c) => !names.includes(c))
    return [...names, ...extra].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [catalog, farm.expenses])

  const filtered = useMemo(
    () =>
      farm.expenses.filter((e: FarmExpense) => {
        if (fCat && e.category !== fCat) return false
        if (fFrom && e.date < fFrom) return false
        if (fTo && e.date > fTo) return false
        return true
      }),
    [farm.expenses, fFrom, fTo, fCat],
  )

  const total = filtered.reduce((n, e) => n + e.amount, 0)
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of filtered) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    return [...map.entries()]
      .map(([value, amount]) => ({ value, label: catLabel(value), amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filtered])
  const maxCat = byCategory[0]?.amount ?? 1

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

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const amt = parseInt(amount, 10)
    if (!amt || amt <= 0) {
      setMsg({ type: 'err', text: 'Montant invalide.' })
      return
    }
    if (!category) {
      setMsg({ type: 'err', text: 'Choisis une catégorie.' })
      return
    }
    void run(async () => {
      await addExpense(date, category, amt, note.trim(), batchId || null, supplyId || null)
      if (recurrence) {
        const next = nextRecurringDate(date, recurrence)
        await addTask(
          `Dépense ${catLabel(category)} (${formatPrice(amt)})`,
          next,
          note.trim() || 'Dépense récurrente',
        )
      }
    }, recurrence ? 'Dépense enregistrée + rappel créé.' : 'Dépense enregistrée.')
    setAmount('')
    setNote('')
    setBatchId('')
    setSupplyId('')
    setRecurrence('')
  }

  const prefillSalaires = () => {
    const salaires = catalog.find((c) => c.name.toLowerCase() === 'salaires')
    setCategory(salaires?.name ?? categoryOptions.find((c) => c.toLowerCase() === 'salaires') ?? '')
    setDate(todayISO())
    setMsg({ type: 'ok', text: 'Catégorie Salaires sélectionnée — indique le nom de la personne dans la note.' })
  }

  const addCategory = () => {
    const name = newCat.trim()
    if (!name) return
    void run(
      () => saveExpenseCategory({ name, sort_order: Math.max(0, ...catalog.map((c) => c.sort_order)) + 1 }),
      'Catégorie ajoutée.',
    )
    setNewCat('')
  }

  const renameCategory = (id: string, current: string) => {
    const name = window.prompt('Nouveau nom de la catégorie :', current)
    if (name === null || !name.trim() || name.trim() === current) return
    void run(() => saveExpenseCategory({ id, name: name.trim() }), 'Catégorie renommée.')
  }

  const toggleCategory = (id: string, active: boolean, name: string) => {
    void run(
      () => saveExpenseCategory({ id, name, active: !active }),
      active ? 'Catégorie désactivée.' : 'Catégorie réactivée.',
    )
  }

  const removeCategory = (id: string, name: string) => {
    if (!window.confirm(`Supprimer définitivement la catégorie « ${name} » ? Les dépenses existantes gardent leur libellé.`)) return
    void run(() => deleteExpenseCategory(id), 'Catégorie supprimée.')
  }

  const exportExpenses = () => {
    exportCsv(
      `depenses-${todayISO()}.csv`,
      ['Date', 'Catégorie', 'Montant (FCFA)', 'Note'],
      filtered.map((e) => [e.date, catLabel(e.category), e.amount, e.note]),
    )
  }

  return (
    <div className="space-y-6">
      {/* Ajout rapide */}
      <form onSubmit={submit} className={`${card} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-bark">Ajouter une dépense</h2>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={prefillSalaires}>
              Dépense salaires du mois
            </button>
            <button type="button" className={btnGhost} onClick={() => setShowCats((v) => !v)}>
              {showCats ? 'Masquer les catégories' : 'Gérer les catégories'}
            </button>
          </div>
        </div>

        {/* Gestion du catalogue */}
        {showCats && (
          <div className="rounded-2xl border border-line bg-cream/60 p-4">
            <p className="mb-3 text-sm font-semibold text-bark">Catalogue des catégories</p>
            <ul className="space-y-2">
              {catalog.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`flex-1 ${c.active ? 'text-bark' : 'text-bark-soft line-through'}`}>{c.name}</span>
                  <button type="button" className="text-xs font-semibold text-terra-dark hover:underline" onClick={() => renameCategory(c.id, c.name)}>
                    Renommer
                  </button>
                  <button type="button" className="text-xs font-semibold text-bark-soft hover:text-bark" onClick={() => toggleCategory(c.id, c.active, c.name)}>
                    {c.active ? 'Désactiver' : 'Réactiver'}
                  </button>
                  <button type="button" className="text-xs font-semibold text-terra-dark hover:underline" onClick={() => removeCategory(c.id, c.name)}>
                    Supprimer
                  </button>
                </li>
              ))}
              {catalog.length === 0 && <li className="text-sm text-bark-soft">Aucune catégorie — exécute d'abord supabase/ferme-v2-3.sql.</li>}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className={inputCls}
                placeholder="Nouvelle catégorie"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
              />
              <button type="button" className={btnGhost} onClick={addCategory} disabled={!newCat.trim() || busy}>
                Ajouter
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className={labelCls}>Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Catégorie</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} required>
              <option value="">— Choisir —</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{catLabel(c)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Montant (FCFA)</span>
            <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="Ex : 15000" />
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
          <label className="block">
            <span className={labelCls}>Article d'approvisionnement (facultatif)</span>
            <select value={supplyId} onChange={(e) => setSupplyId(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {farm.supplies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Récurrence (facultatif)</span>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as '' | 'hebdo' | 'mensuel')} className={inputCls}>
              <option value="">Aucune</option>
              <option value="hebdo">Hebdomadaire</option>
              <option value="mensuel">Mensuelle</option>
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className={labelCls}>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Ex : sac d'aliment, nom de la personne pour les salaires…" />
          </label>
        </div>
        {msg && (
          <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Enregistrement…' : 'Enregistrer la dépense'}
        </button>
      </form>

      {/* Filtres + total */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-bark">Dépenses</h3>
          <button type="button" className={btnGhost} onClick={exportExpenses}>Export CSV</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={inputCls} aria-label="Du" />
          <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={inputCls} aria-label="Au" />
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={inputCls} aria-label="Catégorie">
            <option value="">Toutes catégories</option>
            {filterOptions.map((c) => (
              <option key={c} value={c}>{catLabel(c)}</option>
            ))}
          </select>
          <p className="flex items-center rounded-xl bg-sand/60 px-4 py-3 text-sm">
            <span className="text-bark-soft">Total de la période : </span>
            <strong className="ml-2 text-terra-dark">{formatPrice(total)}</strong>
          </p>
        </div>

        {/* Répartition par catégorie */}
        {byCategory.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-bark-soft">Répartition</p>
            {byCategory.map((c) => (
              <div key={c.value} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-bark">{c.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-terra" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right font-medium text-bark">{formatPrice(c.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Catégorie</th>
                <th className="py-3 pr-4">Bande</th>
                <th className="py-3 pr-4">Montant</th>
                <th className="py-3 pr-4">Note</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-bark-soft">Aucune dépense.</td>
                </tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(e.date)}</td>
                  <td className="py-3 pr-4 font-medium text-bark">{catLabel(e.category)}</td>
                  <td className="py-3 pr-4 text-bark-soft">
                    {e.batch_id ? (farm.batches.find((b) => b.id === e.batch_id)?.name ?? '—') : '—'}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-terra-dark">{formatPrice(e.amount)}</td>
                  <td className="py-3 pr-4 text-bark-soft">{e.note}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="text-xs font-semibold text-terra-dark hover:underline"
                      onClick={() => {
                        if (window.confirm('Supprimer cette dépense ?')) {
                          void run(() => deleteExpense(e.id), 'Dépense supprimée.')
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
