import { useState, type FormEvent } from 'react'
import { addTask, deleteTask, fmtDateFr, todayISO, toggleTask } from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import type { Product } from '../../../lib/types'

const inputCls =
  'w-full rounded-xl border border-line bg-cream px-4 py-3 text-base text-bark placeholder:text-bark-soft/60 focus:border-terra focus:outline-none sm:text-sm'
const btnPrimary =
  'btn rounded-full bg-terra px-5 py-2.5 text-sm font-semibold text-cream hover:bg-terra-dark disabled:opacity-60'
const card = 'rounded-[2rem] bg-white p-6 shadow-card'
const labelCls = 'mb-1.5 block text-sm font-medium text-bark'

interface Props {
  farm: FarmData
  refetch: () => void
  products: Product[]
}

export default function FarmTasks({ farm, refetch }: Props) {
  const [title, setTitle] = useState('')
  const [dueOn, setDueOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

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
    if (!title.trim()) {
      setMsg({ type: 'err', text: 'Le titre est obligatoire.' })
      return
    }
    void run(() => addTask(title.trim(), dueOn, note.trim()), 'Rappel ajouté.')
    setTitle('')
    setNote('')
  }

  const today = todayISO()
  const pending = farm.tasks.filter((t) => !t.done)
  const done = farm.tasks.filter((t) => t.done)

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className={`${card} space-y-4`}>
        <h2 className="font-display text-lg font-semibold text-bark">Nouveau rappel</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className={labelCls}>Titre *</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Ex : Vaccin Newcastle, Nettoyage du poulailler…" />
          </label>
          <label className="block">
            <span className={labelCls}>Échéance</span>
            <input type="date" required value={dueOn} onChange={(e) => setDueOn(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </label>
        </div>
        {msg && (
          <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Enregistrement…' : 'Ajouter le rappel'}
        </button>
      </form>

      <div className={card}>
        <h3 className="font-display text-base font-semibold text-bark">À faire ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-bark-soft">Aucun rappel en attente.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {pending.map((t) => {
              const overdue = t.due_on < today
              const dueToday = t.due_on === today
              return (
                <li
                  key={t.id}
                  className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${
                    overdue ? 'border-terra/50 bg-terra-soft/30' : dueToday ? 'border-terra/30 bg-terra-soft/20' : 'border-line'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => void run(() => toggleTask(t.id, true), 'Rappel marqué comme fait.')}
                    className="h-5 w-5 accent-terra"
                    aria-label="Marquer comme fait"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-bark">{t.title}</p>
                    {t.note && <p className="text-xs text-bark-soft">{t.note}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${overdue ? 'bg-terra text-cream' : dueToday ? 'bg-terra-soft text-terra-dark' : 'bg-sand text-bark-soft'}`}>
                    {overdue ? `En retard — ${fmtDateFr(t.due_on)}` : dueToday ? 'Aujourd’hui' : fmtDateFr(t.due_on)}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-terra-dark hover:underline"
                    onClick={() => {
                      if (window.confirm('Supprimer ce rappel ?')) {
                        void run(() => deleteTask(t.id), 'Rappel supprimé.')
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {done.length > 0 && (
        <div className={card}>
          <h3 className="font-display text-base font-semibold text-bark">Terminés ({done.length})</h3>
          <ul className="mt-4 space-y-2">
            {done.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-line/60 p-3 opacity-60">
                <input
                  type="checkbox"
                  checked
                  onChange={() => void run(() => toggleTask(t.id, false), 'Rappel réouvert.')}
                  className="h-5 w-5 accent-terra"
                  aria-label="Rouvrir"
                />
                <span className="flex-1 text-sm text-bark line-through">{t.title}</span>
                <span className="text-xs text-bark-soft">{fmtDateFr(t.due_on)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
