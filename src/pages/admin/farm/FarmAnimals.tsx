import { useMemo, useState, type FormEvent } from 'react'
import {
  addBatchEvent,
  deleteBatchEvent,
  exportCsv,
  fmtDateFr,
  saveBatch,
  todayISO,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import type { FarmBatch, FarmBatchEvent, Product } from '../../../lib/types'
import { BATCH_EVENT_TYPES, BATCH_KINDS } from '../../../lib/types'

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

const kindLabel = (k: string) => BATCH_KINDS.find((x) => x.value === k)?.label ?? k
const eventLabel = (t: string) => BATCH_EVENT_TYPES.find((x) => x.value === t)?.label ?? t

function age(b: FarmBatch): string {
  if (!b.arrived_on) return '—'
  const days = Math.max(0, Math.round((Date.now() - new Date(`${b.arrived_on}T12:00:00Z`).getTime()) / 86400000))
  if (days < 30) return `${days} j`
  const months = Math.floor(days / 30)
  return `${months} mois${months > 1 ? 's' : ''}`
}

export default function FarmAnimals({ farm, refetch }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FarmBatch | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Formulaire bande
  const [fName, setFName] = useState('')
  const [fSpecies, setFSpecies] = useState('')
  const [fBreed, setFBreed] = useState('')
  const [fKind, setFKind] = useState<FarmBatch['kind']>('pondeuses')
  const [fArrived, setFArrived] = useState(todayISO())
  const [fCount, setFCount] = useState('')
  const [fNote, setFNote] = useState('')
  const [fEggColor, setFEggColor] = useState('')
  const [fDisplayColor, setFDisplayColor] = useState('')
  const [fCaliber, setFCaliber] = useState('')

  // Événement
  const [evDate, setEvDate] = useState(todayISO())
  const [evType, setEvType] = useState<FarmBatchEvent['type']>('mortalite')
  const [evQty, setEvQty] = useState('')
  const [evNote, setEvNote] = useState('')

  const batches = farm.batches
  const selected = batches.find((b) => b.id === selectedId) ?? null

  const stats = useMemo(() => {
    if (!selected) return null
    const events = farm.batchEvents.filter((e) => e.batch_id === selected.id)
    const deaths = events.filter((e) => e.type === 'mortalite').reduce((n, e) => n + Math.abs(e.qty), 0)
    const arrivals = selected.initial_count + events.filter((e) => e.type === 'arrivee').reduce((n, e) => n + Math.max(0, e.qty), 0)
    const mortalityRate = arrivals > 0 ? (deaths / arrivals) * 100 : 0

    const since = new Date(`${todayISO()}T00:00:00Z`)
    since.setUTCDate(since.getUTCDate() - 29)
    const sinceStr = since.toISOString().slice(0, 10)
    const ponteEggs = farm.eggMovements
      .filter((m) => m.kind === 'ponte' && m.batch_id === selected.id && m.date >= sinceStr)
      .reduce((n, m) => n + m.qty_eggs, 0)

    return { deaths, mortalityRate, pontePerDay: ponteEggs / 30, events }
  }, [selected, farm.batchEvents, farm.eggMovements])

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
    setEditing(null)
    setFName('')
    setFSpecies('')
    setFBreed('')
    setFKind('pondeuses')
    setFArrived(todayISO())
    setFCount('')
    setFNote('')
    setFEggColor('')
    setFDisplayColor('')
    setFCaliber('')
    setShowForm(true)
    setMsg(null)
  }

  const openEdit = (b: FarmBatch) => {
    setEditing(b)
    setFName(b.name)
    setFSpecies(b.species)
    setFBreed(b.breed)
    setFKind(b.kind)
    setFArrived(b.arrived_on ?? todayISO())
    setFCount(String(b.initial_count))
    setFNote(b.note)
    setFEggColor(b.egg_color ?? '')
    setFDisplayColor(b.display_color ?? '')
    setFCaliber(b.caliber ?? '')
    setShowForm(true)
    setMsg(null)
  }

  const submitBatch = (e: FormEvent) => {
    e.preventDefault()
    if (!fName.trim()) {
      setMsg({ type: 'err', text: 'Le nom de la bande est obligatoire.' })
      return
    }
    void run(
      () =>
        saveBatch({
          id: editing?.id,
          name: fName.trim(),
          species: fSpecies.trim(),
          breed: fBreed.trim(),
          kind: fKind,
          arrived_on: fArrived || null,
          initial_count: parseInt(fCount, 10) || 0,
          note: fNote.trim(),
          egg_color: fEggColor,
          display_color: fDisplayColor.trim(),
          caliber: fCaliber,
        }),
      editing ? 'Bande modifiée.' : 'Bande créée.',
    ).then(() => setShowForm(false))
  }

  const closeBatch = (b: FarmBatch) => {
    if (!window.confirm(`Clôturer la bande « ${b.name} » ?`)) return
    void run(
      () => saveBatch({ id: b.id, status: 'terminee' }),
      'Bande clôturée.',
    )
  }

  const submitEvent = (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const n = parseInt(evQty, 10)
    if (!n || n === 0) {
      setMsg({ type: 'err', text: 'Quantité invalide (non nulle).' })
      return
    }
    // mortalité / vente / transfert : saisie positive → stockée en négatif
    const negativeTypes = ['mortalite', 'vente', 'transfert']
    const qty = negativeTypes.includes(evType) ? -Math.abs(n) : n
    void run(
      () => addBatchEvent(selected.id, evDate, evType, qty, evNote.trim()),
      'Événement enregistré.',
    )
    setEvQty('')
    setEvNote('')
  }

  const exportAnimals = () => {
    exportCsv(
      `animaux-${todayISO()}.csv`,
      ['Bande', 'Espèce', 'Race', 'Type', 'Arrivée', 'Âge', 'Effectif', 'Statut', 'Note'],
      batches.map((b) => [
        b.name,
        b.species,
        b.breed,
        kindLabel(b.kind),
        b.arrived_on ?? '',
        age(b),
        b.effectif_actuel ?? b.initial_count,
        b.status === 'actif' ? 'Actif' : 'Terminé',
        b.note,
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-bark">Bandes</h2>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={exportAnimals}>Export CSV</button>
          <button type="button" className={btnPrimary} onClick={openCreate}>Nouvelle bande</button>
        </div>
      </div>

      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
          {msg.text}
        </p>
      )}

      {/* Formulaire création / modification */}
      {showForm && (
        <form onSubmit={submitBatch} className={`${card} space-y-4 border border-terra/20`}>
          <h3 className="font-display text-base font-semibold text-bark">
            {editing ? `Modifier « ${editing.name} »` : 'Nouvelle bande'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Nom de la bande *</span>
              <input required value={fName} onChange={(e) => setFName(e.target.value)} className={inputCls} placeholder="Ex : Poules Marans 2025" />
            </label>
            <label className="block">
              <span className={labelCls}>Espèce</span>
              <input value={fSpecies} onChange={(e) => setFSpecies(e.target.value)} className={inputCls} placeholder="Ex : Poule" />
            </label>
            <label className="block">
              <span className={labelCls}>Race / variété</span>
              <input value={fBreed} onChange={(e) => setFBreed(e.target.value)} className={inputCls} placeholder="Ex : Marans" />
            </label>
            <label className="block">
              <span className={labelCls}>Type</span>
              <select value={fKind} onChange={(e) => setFKind(e.target.value as FarmBatch['kind'])} className={inputCls}>
                {BATCH_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Date d'arrivée</span>
              <input type="date" value={fArrived} onChange={(e) => setFArrived(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Effectif initial</span>
              <input type="number" min="0" inputMode="numeric" value={fCount} onChange={(e) => setFCount(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Couleur des œufs</span>
              <select value={fEggColor} onChange={(e) => setFEggColor(e.target.value)} className={inputCls}>
                <option value="">—</option>
                <option value="roux">Roux</option>
                <option value="blanc">Blanc</option>
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Couleur d'affichage</span>
              <span className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(fDisplayColor) ? fDisplayColor : '#c9a24b'}
                  onChange={(e) => setFDisplayColor(e.target.value)}
                  className="h-12 w-14 cursor-pointer rounded-lg border border-line bg-cream"
                  aria-label="Couleur d'affichage"
                />
                <input
                  value={fDisplayColor}
                  onChange={(e) => setFDisplayColor(e.target.value)}
                  className={inputCls}
                  placeholder="#c9a24b"
                />
              </span>
            </label>
            <label className="block">
              <span className={labelCls}>Calibre (info)</span>
              <select value={fCaliber} onChange={(e) => setFCaliber(e.target.value)} className={inputCls}>
                <option value="">—</option>
                <option value="petit">Petit</option>
                <option value="moyen">Moyen</option>
                <option value="gros">Gros</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Note</span>
            <input value={fNote} onChange={(e) => setFNote(e.target.value)} className={inputCls} />
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className={btnGhost} onClick={() => setShowForm(false)}>Fermer</button>
          </div>
        </form>
      )}

      {/* Liste des lots */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {batches.length === 0 && (
          <p className={`${card} sm:col-span-2 xl:col-span-3 text-center text-sm text-bark-soft`}>
            Aucune bande pour le moment.
          </p>
        )}
        {batches.map((b) => (
          <div
            key={b.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(selectedId === b.id ? null : b.id)}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedId(selectedId === b.id ? null : b.id)}
            className={`${card} cursor-pointer transition-shadow hover:shadow-lg ${selectedId === b.id ? 'ring-2 ring-terra' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-bark">
                  {b.display_color && (
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-line"
                      style={{ backgroundColor: b.display_color }}
                      aria-hidden="true"
                    />
                  )}
                  {b.name}
                </h3>
                <p className="text-xs text-bark-soft">
                  {[b.species, b.breed, b.egg_color, b.caliber].filter(Boolean).join(' · ') || '—'} · {kindLabel(b.kind)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.status === 'actif' ? 'bg-leaf-soft text-leaf-dark' : 'bg-sand text-bark-soft'}`}>
                {b.status === 'actif' ? 'Actif' : 'Terminé'}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-sand/60 py-2">
                <dt className="text-[11px] uppercase text-bark-soft">Effectif</dt>
                <dd className="font-display text-lg font-semibold text-bark">{b.effectif_actuel ?? b.initial_count}</dd>
              </div>
              <div className="rounded-xl bg-sand/60 py-2">
                <dt className="text-[11px] uppercase text-bark-soft">Âge</dt>
                <dd className="font-display text-lg font-semibold text-bark">{age(b)}</dd>
              </div>
              <div className="rounded-xl bg-sand/60 py-2">
                <dt className="text-[11px] uppercase text-bark-soft">Initial</dt>
                <dd className="font-display text-lg font-semibold text-bark">{b.initial_count}</dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button type="button" className={btnGhost} onClick={() => openEdit(b)}>Modifier</button>
              {b.status === 'actif' && (
                <button type="button" className={btnGhost} onClick={() => closeBatch(b)}>Clôturer</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fiche de la bande */}
      {selected && stats && (
        <div className={`${card} space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-bark">{selected.name}</h3>
              <p className="text-sm text-bark-soft">
                Effectif actuel : <strong>{selected.effectif_actuel ?? selected.initial_count}</strong>
                {(selected.effectif_actuel ?? selected.initial_count) > 0 ? (
                  <>
                    {' · '}Mortalité : <strong>{stats.mortalityRate.toFixed(1)} %</strong> ({stats.deaths})
                    {' · '}Ponte moy./j (30 j) : <strong>{stats.pontePerDay.toFixed(1)}</strong>
                  </>
                ) : (
                  <span className="ml-2 italic">Renseigne l'effectif pour voir le taux de ponte.</span>
                )}
              </p>
            </div>
            <button type="button" className={btnGhost} onClick={() => setSelectedId(null)}>Fermer</button>
          </div>

          {/* Ajout rapide événement */}
          <form onSubmit={submitEvent} className="rounded-2xl bg-sand/50 p-4">
            <p className="mb-3 text-sm font-semibold text-bark">Ajouter un événement</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input type="date" required value={evDate} onChange={(e) => setEvDate(e.target.value)} className={inputCls} aria-label="Date" />
              <select value={evType} onChange={(e) => setEvType(e.target.value as FarmBatchEvent['type'])} className={inputCls} aria-label="Type">
                {BATCH_EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                type="number"
                required
                value={evQty}
                onChange={(e) => setEvQty(e.target.value)}
                className={inputCls}
                placeholder={['mortalite', 'vente', 'transfert'].includes(evType) ? 'Nombre (+)' : evType === 'ajustement' ? 'Signé (+/-)' : 'Nombre'}
                aria-label="Quantité"
              />
              <input value={evNote} onChange={(e) => setEvNote(e.target.value)} className={inputCls} placeholder="Note" aria-label="Note" />
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? '…' : 'Ajouter'}
              </button>
            </div>
            <p className="mt-2 text-xs text-bark-soft">
              Mortalité, vente et transfert se saisissent en positif et sont retranchés de l'effectif ; ajustement accepte une valeur signée.
            </p>
          </form>

          {/* Historique des événements */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Événement</th>
                  <th className="py-3 pr-4">Qté</th>
                  <th className="py-3 pr-4">Note</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {stats.events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-bark-soft">Aucun événement.</td>
                  </tr>
                )}
                {stats.events.map((e) => (
                  <tr key={e.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(e.date)}</td>
                    <td className="py-3 pr-4 font-medium text-bark">{eventLabel(e.type)}</td>
                    <td className={`py-3 pr-4 font-semibold ${e.qty >= 0 ? 'text-leaf-dark' : 'text-terra-dark'}`}>
                      {e.qty > 0 ? `+${e.qty}` : e.qty}
                    </td>
                    <td className="py-3 pr-4 text-bark-soft">{e.note}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-terra-dark hover:underline"
                        onClick={() => {
                          if (window.confirm('Supprimer cet événement ?')) {
                            void run(() => deleteBatchEvent(e.id), 'Événement supprimé.')
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
      )}
    </div>
  )
}
