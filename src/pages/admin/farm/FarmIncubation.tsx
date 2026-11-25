import { useState, type FormEvent } from 'react'
import {
  daysUntil,
  finishIncubation,
  fmtDateFr,
  startIncubation,
  todayISO,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import type { FarmBatch, Incubation, Product } from '../../../lib/types'

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

export default function FarmIncubation({ farm, refetch }: Props) {
  const [showStart, setShowStart] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Formulaire démarrage
  const [sBatch, setSBatch] = useState('')
  const [sDate, setSDate] = useState(todayISO())
  const [sEggs, setSEggs] = useState('')
  const [sDays, setSDays] = useState('21')
  const [sNote, setSNote] = useState('')

  // Formulaire éclosion (par incubation)
  const [finId, setFinId] = useState<string | null>(null)
  const [fHatched, setFHatched] = useState('')
  const [fCreateBatch, setFCreateBatch] = useState(true)
  const [fBatchName, setFBatchName] = useState('')

  const activeBatches = farm.batches.filter((b: FarmBatch) => b.status === 'actif')
  const batchName = (id: string | null) => (id ? (farm.batches.find((b) => b.id === id)?.name ?? '—') : '—')

  const ongoing = farm.incubations.filter((i) => i.status === 'en_cours')
  const finished = farm.incubations.filter((i) => i.status === 'terminee')

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

  const submitStart = (e: FormEvent) => {
    e.preventDefault()
    const eggs = parseInt(sEggs, 10)
    if (!eggs || eggs <= 0) {
      setMsg({ type: 'err', text: 'Nombre d\u2019œufs à couver invalide.' })
      return
    }
    if (eggs > farm.eggReserve) {
      setMsg({ type: 'err', text: `Réserve insuffisante : ${farm.eggReserve} œufs en réserve.` })
      return
    }
    void run(
      () => startIncubation(sBatch || null, sDate, eggs, parseInt(sDays, 10) || 21, sNote.trim()),
      'Incubation démarrée.',
    ).then(() => {
      setShowStart(false)
      setSEggs('')
      setSNote('')
    })
  }

  const submitFinish = (e: FormEvent, inc: Incubation) => {
    e.preventDefault()
    const hatched = Math.max(0, parseInt(fHatched, 10) || 0)
    void run(
      () => finishIncubation(inc.id, hatched, fCreateBatch, fBatchName.trim()),
      fCreateBatch && hatched > 0 ? 'Incubation clôturée et bande de poussins créé.' : 'Incubation clôturée.',
    ).then(() => {
      setFinId(null)
      setFHatched('')
      setFBatchName('')
    })
  }

  const hatchRate = (i: Incubation) =>
    i.status === 'terminee' && i.hatched_count != null && i.eggs_set > 0
      ? Math.round((i.hatched_count / i.eggs_set) * 100)
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-bark">Incubations</h2>
        <button type="button" className={btnPrimary} onClick={() => setShowStart((v) => !v)}>
          {showStart ? 'Fermer' : 'Nouvelle incubation'}
        </button>
      </div>

      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
          {msg.text}
        </p>
      )}

      {showStart && (
        <form onSubmit={submitStart} className={`${card} space-y-4 border border-terra/20`}>
          <h3 className="font-display text-base font-semibold text-bark">Démarrer une incubation</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={labelCls}>Bande d'origine (facultatif)</span>
              <select value={sBatch} onChange={(e) => setSBatch(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {activeBatches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Date de mise</span>
              <input type="date" required value={sDate} onChange={(e) => setSDate(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Œufs à couver</span>
              <input type="number" min="1" required value={sEggs} onChange={(e) => setSEggs(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Durée (jours)</span>
              <input type="number" min="1" max="90" value={sDays} onChange={(e) => setSDays(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Note</span>
            <input value={sNote} onChange={(e) => setSNote(e.target.value)} className={inputCls} />
          </label>
          <p className="text-xs text-bark-soft">
            Les œufs sont automatiquement sortis de la réserve ({farm.eggReserve} œufs disponibles).
          </p>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? 'Enregistrement…' : 'Démarrer'}
            </button>
            <button type="button" className={btnGhost} onClick={() => setShowStart(false)}>Fermer</button>
          </div>
        </form>
      )}

      {/* En cours */}
      <div className={card}>
        <h3 className="font-display text-base font-semibold text-bark">En cours ({ongoing.length})</h3>
        {ongoing.length === 0 ? (
          <p className="mt-3 text-sm text-bark-soft">Aucune incubation en cours.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ongoing.map((inc) => {
              const left = daysUntil(inc.expected_hatch_on)
              return (
                <li key={inc.id} className="rounded-2xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-bark">
                        {inc.eggs_set} œufs
                        {inc.batch_id ? ` — bande ${batchName(inc.batch_id)}` : ''}
                      </p>
                      <p className="text-xs text-bark-soft">
                        Mise le {fmtDateFr(inc.started_on)} · {inc.incubation_days} j · éclosion prévue le{' '}
                        <strong>{fmtDateFr(inc.expected_hatch_on)}</strong>
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${left < 0 ? 'bg-terra-soft/60 text-terra-dark' : left <= 3 ? 'bg-terra-soft/60 text-terra-dark' : 'bg-sand text-bark-soft'}`}>
                      {left < 0 ? `En retard de ${-left} j` : left === 0 ? 'Éclosion aujourd’hui' : `J-${left}`}
                    </span>
                  </div>
                  {finId === inc.id ? (
                    <form onSubmit={(e) => submitFinish(e, inc)} className="mt-4 grid gap-3 rounded-xl bg-sand/50 p-4 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelCls}>Nombre de poussins éclos</span>
                        <input type="number" min="0" required value={fHatched} onChange={(e) => setFHatched(e.target.value)} className={inputCls} />
                      </label>
                      <label className="block">
                        <span className={labelCls}>Nom de la bande (si création)</span>
                        <input value={fBatchName} onChange={(e) => setFBatchName(e.target.value)} className={inputCls} placeholder="Laisser vide = automatique" />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-bark sm:col-span-2">
                        <input type="checkbox" checked={fCreateBatch} onChange={(e) => setFCreateBatch(e.target.checked)} className="accent-terra" />
                        Créer un bande de poussins avec l'effectif éclos
                      </label>
                      <div className="flex gap-3 sm:col-span-2">
                        <button type="submit" disabled={busy} className={btnPrimary}>
                          {busy ? 'Enregistrement…' : 'Enregistrer l’éclosion'}
                        </button>
                        <button type="button" className={btnGhost} onClick={() => setFinId(null)}>Annuler</button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" className={`${btnGhost} mt-3`} onClick={() => { setFinId(inc.id); setFHatched(''); setFBatchName(''); setFCreateBatch(true) }}>
                      Enregistrer l'éclosion
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Historique */}
      <div className={card}>
        <h3 className="font-display text-base font-semibold text-bark">Historique ({finished.length})</h3>
        {finished.length === 0 ? (
          <p className="mt-3 text-sm text-bark-soft">Aucune incubation terminée.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                  <th className="py-3 pr-4">Début</th>
                  <th className="py-3 pr-4">Œufs</th>
                  <th className="py-3 pr-4">Éclos</th>
                  <th className="py-3 pr-4">Taux</th>
                  <th className="py-3 pr-4">Bande</th>
                  <th className="py-3 pr-4">Note</th>
                </tr>
              </thead>
              <tbody>
                {finished.map((inc) => {
                  const rate = hatchRate(inc)
                  return (
                    <tr key={inc.id} className="border-b border-line/60 last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(inc.started_on)}</td>
                      <td className="py-3 pr-4 font-medium text-bark">{inc.eggs_set}</td>
                      <td className="py-3 pr-4 font-medium text-bark">{inc.hatched_count ?? '—'}</td>
                      <td className="py-3 pr-4 font-semibold text-leaf-dark">{rate != null ? `${rate} %` : '—'}</td>
                      <td className="py-3 pr-4 text-bark-soft">{batchName(inc.batch_id)}</td>
                      <td className="py-3 pr-4 text-bark-soft">{inc.note}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
