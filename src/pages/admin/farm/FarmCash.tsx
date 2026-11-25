import { useMemo, useState, type FormEvent } from 'react'
import {
  addCashMovement,
  computeApports,
  computeTreasury,
  deleteCashMovement,
  fmtDateFr,
  todayISO,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import { formatPrice } from '../../../lib/store'
import type { CashMovementKind, Product } from '../../../lib/types'
import { CASH_MOVEMENT_KINDS } from '../../../lib/types'

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

const kindLabel = (k: CashMovementKind) => CASH_MOVEMENT_KINDS.find((x) => x.value === k)?.label ?? k
const kindSign = (k: CashMovementKind) => CASH_MOVEMENT_KINDS.find((x) => x.value === k)?.sign ?? 1

function monthStart(): string {
  return todayISO().slice(0, 8) + '01'
}

export default function FarmCash({ farm, refetch }: Props) {
  const [date, setDate] = useState(todayISO())
  const [kind, setKind] = useState<CashMovementKind>('apport_promoteur')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayISO())

  const treasury = useMemo(() => computeTreasury(farm, from, to), [farm, from, to])
  const apports = useMemo(() => computeApports(farm, from, to), [farm, from, to])

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
    void run(
      () => addCashMovement({ date, kind, amount: amt, note: note.trim() }),
      'Mouvement de caisse enregistré.',
    )
    setAmount('')
    setNote('')
  }

  const rows: { label: string; value: number; tone: 'in' | 'out' | 'neutral' }[] = [
    { label: 'Ventes encaissées', value: treasury.ventesEncaissees, tone: 'in' },
    { label: 'Apports du promoteur', value: treasury.apports, tone: 'in' },
    { label: 'Autres entrées', value: treasury.autresEntrees, tone: 'in' },
    { label: 'Dépenses', value: -treasury.depenses, tone: 'out' },
    { label: 'Remboursements', value: -treasury.remboursements, tone: 'out' },
    { label: 'Retraits', value: -treasury.retraits, tone: 'out' },
    { label: 'Autres sorties', value: -treasury.autresSorties, tone: 'out' },
  ]

  return (
    <div className="space-y-6">
      {/* Solde + détail */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-bark">Trésorerie</h3>
          <div className="flex gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-auto`} aria-label="Du" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-auto`} aria-label="Au" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <div key={r.label} className="rounded-2xl bg-cream/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-bark-soft">{r.label}</p>
              <p className={`mt-1 text-lg font-bold ${r.tone === 'in' ? 'text-leaf-dark' : r.tone === 'out' ? 'text-terra-dark' : 'text-bark'}`}>
                {formatPrice(r.value)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-sand/60 px-5 py-4">
          <span className="font-semibold text-bark">Solde de la période</span>
          <strong className={`text-xl ${treasury.solde >= 0 ? 'text-leaf-dark' : 'text-terra-dark'}`}>
            {formatPrice(treasury.solde)}
          </strong>
        </div>

        {/* Apports du promoteur */}
        <div className="mt-4 rounded-2xl border border-line p-4">
          <p className="text-sm font-semibold text-bark">Apports du promoteur</p>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
            <p className="text-bark-soft">Versés : <strong className="text-bark">{formatPrice(apports.apports)}</strong></p>
            <p className="text-bark-soft">Remboursés : <strong className="text-bark">{formatPrice(apports.remboursements)}</strong></p>
            <p className="text-bark-soft">Solde : <strong className={apports.solde >= 0 ? 'text-leaf-dark' : 'text-terra-dark'}>{formatPrice(apports.solde)}</strong></p>
          </div>
        </div>

        {/* Détail des dépenses par catégorie */}
        {treasury.detailDepenses.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-bark-soft">Dépenses par catégorie</p>
            <div className="flex flex-wrap gap-2">
              {treasury.detailDepenses.map((d) => (
                <span key={d.category} className="rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-bark">
                  {d.category} : {formatPrice(d.amount)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Saisie rapide */}
      <form onSubmit={submit} className={`${card} space-y-4`}>
        <h3 className="font-display text-base font-semibold text-bark">Nouveau mouvement</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={labelCls}>Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as CashMovementKind)} className={inputCls}>
              {CASH_MOVEMENT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Montant (FCFA)</span>
            <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="Ex : 50000" />
          </label>
          <label className="block">
            <span className={labelCls}>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Ex : acompte matériel" />
          </label>
        </div>
        {msg && (
          <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      {/* Historique */}
      <div className={card}>
        <h3 className="font-display text-base font-semibold text-bark">Historique</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Montant</th>
                <th className="py-3 pr-4">Note</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {farm.cashMovements.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-bark-soft">Aucun mouvement de caisse.</td>
                </tr>
              )}
              {farm.cashMovements.map((m) => (
                <tr key={m.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(m.date)}</td>
                  <td className="py-3 pr-4 font-medium text-bark">{kindLabel(m.kind)}</td>
                  <td className={`py-3 pr-4 font-semibold ${kindSign(m.kind) > 0 ? 'text-leaf-dark' : 'text-terra-dark'}`}>
                    {kindSign(m.kind) > 0 ? '+' : '−'}{formatPrice(m.amount)}
                  </td>
                  <td className="py-3 pr-4 text-bark-soft">{m.note}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="text-xs font-semibold text-terra-dark hover:underline"
                      onClick={() => {
                        if (window.confirm('Supprimer ce mouvement ?')) {
                          void run(() => deleteCashMovement(m.id), 'Mouvement supprimé.')
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
