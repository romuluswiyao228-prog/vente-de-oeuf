import { useMemo, useState, type FormEvent } from 'react'
import {
  clientStats,
  fmtDateFr,
  receivePayment,
  saveClient,
  todayISO,
} from '../../../lib/farm'
import type { FarmData } from '../../../lib/farm'
import { formatPrice } from '../../../lib/store'
import type { ClientType, FarmClient, PaymentMethodKind, Product } from '../../../lib/types'
import { CLIENT_TYPES, PAYMENT_METHODS } from '../../../lib/types'

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

const typeLabel = (t: string) => CLIENT_TYPES.find((x) => x.value === t)?.label ?? t
const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m

export default function FarmClients({ farm, refetch }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FarmClient | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Formulaire client
  const [fName, setFName] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fType, setFType] = useState<ClientType>('particulier')
  const [fNote, setFNote] = useState('')

  // Encaissement
  const [showPay, setShowPay] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISO())
  const [payMethod, setPayMethod] = useState<PaymentMethodKind>('especes')
  const [payNote, setPayNote] = useState('')

  const clients = farm.farmClients
  const visible = clients.filter((c) => showArchived || c.active)
  const selected = clients.find((c) => c.id === selectedId) ?? null

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; reste: number; dernier: string | null }>()
    for (const c of clients) map.set(c.id, clientStats(c.id, farm.sales))
    return map
  }, [clients, farm.sales])

  const selectedSales = selected
    ? farm.sales.filter((s) => s.client_id === selected.id)
    : []
  const selectedPayments = selected
    ? farm.clientPayments.filter((p) => p.client_id === selected.id)
    : []
  const selectedStats = selected ? stats.get(selected.id) : null

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
    setFPhone('')
    setFType('particulier')
    setFNote('')
    setShowForm(true)
    setMsg(null)
  }

  const openEdit = (c: FarmClient) => {
    setEditing(c)
    setFName(c.name)
    setFPhone(c.phone)
    setFType(c.type)
    setFNote(c.note)
    setShowForm(true)
    setMsg(null)
  }

  const submitClient = (e: FormEvent) => {
    e.preventDefault()
    if (!fName.trim()) {
      setMsg({ type: 'err', text: 'Le nom du client est obligatoire.' })
      return
    }
    void run(
      () =>
        saveClient({
          id: editing?.id,
          name: fName.trim(),
          phone: fPhone.trim(),
          type: fType,
          note: fNote.trim(),
          active: editing?.active ?? true,
        }),
      editing ? 'Client modifié.' : 'Client créé.',
    ).then(() => setShowForm(false))
  }

  const toggleActive = (c: FarmClient) => {
    const label = c.active ? 'archiver' : 'réactiver'
    if (!window.confirm(`${c.active ? 'Archiver' : 'Réactiver'} le client « ${c.name} » ?`)) return
    void run(() => saveClient({ ...c, active: !c.active }), `Client ${label === 'archiver' ? 'archivé' : 'réactivé'}.`)
  }

  const submitPayment = (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const amt = parseInt(payAmount, 10)
    if (!amt || amt <= 0) {
      setMsg({ type: 'err', text: 'Montant invalide.' })
      return
    }
    void run(
      () => receivePayment(selected.id, amt, payDate, payMethod, payNote.trim()),
      'Encaissement enregistré et réparti sur les ventes.',
    ).then(() => {
      setShowPay(false)
      setPayAmount('')
      setPayNote('')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-bark">Clients</h2>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Masquer archivés' : 'Voir archivés'}
          </button>
          <button type="button" className={btnPrimary} onClick={openCreate}>Nouveau client</button>
        </div>
      </div>

      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/50 text-terra-dark'}`}>
          {msg.text}
        </p>
      )}

      {/* Formulaire client */}
      {showForm && (
        <form onSubmit={submitClient} className={`${card} space-y-4 border border-terra/20`}>
          <h3 className="font-display text-base font-semibold text-bark">
            {editing ? `Modifier « ${editing.name} »` : 'Nouveau client'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={labelCls}>Nom *</span>
              <input required value={fName} onChange={(e) => setFName(e.target.value)} className={inputCls} placeholder="Ex : Boutique Awa" />
            </label>
            <label className="block">
              <span className={labelCls}>Téléphone</span>
              <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} className={inputCls} placeholder="Ex : 90 00 00 00" />
            </label>
            <label className="block">
              <span className={labelCls}>Type</span>
              <select value={fType} onChange={(e) => setFType(e.target.value as ClientType)} className={inputCls}>
                {CLIENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Note</span>
              <input value={fNote} onChange={(e) => setFNote(e.target.value)} className={inputCls} />
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

      {/* Liste des clients */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.length === 0 && (
          <p className={`${card} sm:col-span-2 xl:col-span-3 text-center text-sm text-bark-soft`}>
            Aucun client pour le moment.
          </p>
        )}
        {visible.map((c) => {
          const st = stats.get(c.id) ?? { total: 0, reste: 0, dernier: null }
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedId(selectedId === c.id ? null : c.id)}
              className={`${card} cursor-pointer transition-shadow hover:shadow-lg ${selectedId === c.id ? 'ring-2 ring-terra' : ''} ${!c.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-bark">{c.name}</h3>
                  <p className="text-xs text-bark-soft">
                    {typeLabel(c.type)}{c.phone ? ` · ${c.phone}` : ''}
                  </p>
                </div>
                {!c.active && (
                  <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-bark-soft">Archivé</span>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-sand/60 py-2">
                  <dt className="text-[11px] uppercase text-bark-soft">Acheté</dt>
                  <dd className="font-display text-sm font-semibold text-bark">{formatPrice(st.total)}</dd>
                </div>
                <div className="rounded-xl bg-sand/60 py-2">
                  <dt className="text-[11px] uppercase text-bark-soft">Reste</dt>
                  <dd className={`font-display text-sm font-semibold ${st.reste > 0 ? 'text-terra-dark' : 'text-leaf-dark'}`}>
                    {formatPrice(st.reste)}
                  </dd>
                </div>
                <div className="rounded-xl bg-sand/60 py-2">
                  <dt className="text-[11px] uppercase text-bark-soft">Dernière vente</dt>
                  <dd className="font-display text-sm font-semibold text-bark">{st.dernier ? fmtDateFr(st.dernier) : '—'}</dd>
                </div>
              </dl>
              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button type="button" className={btnGhost} onClick={() => openEdit(c)}>Modifier</button>
                <button type="button" className={btnGhost} onClick={() => toggleActive(c)}>
                  {c.active ? 'Archiver' : 'Réactiver'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Fiche client */}
      {selected && selectedStats && (
        <div className={`${card} space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-bark">{selected.name}</h3>
              <p className="text-sm text-bark-soft">
                {typeLabel(selected.type)}{selected.phone ? ` · ${selected.phone}` : ''}
                {' · '}Total acheté : <strong>{formatPrice(selectedStats.total)}</strong>
                {' · '}Reste à payer : <strong className={selectedStats.reste > 0 ? 'text-terra-dark' : 'text-leaf-dark'}>{formatPrice(selectedStats.reste)}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} onClick={() => { setShowPay((v) => !v); setMsg(null) }}>
                Encaisser
              </button>
              <button type="button" className={btnGhost} onClick={() => setSelectedId(null)}>Fermer</button>
            </div>
          </div>

          {showPay && (
            <form onSubmit={submitPayment} className="space-y-4 rounded-2xl border border-terra/20 p-4">
              <h4 className="font-display text-base font-semibold text-bark">Encaisser un paiement</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className={labelCls}>Montant (FCFA)</span>
                  <input type="number" min="1" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputCls} placeholder="Ex : 60000" />
                </label>
                <label className="block">
                  <span className={labelCls}>Date</span>
                  <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Moyen</span>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethodKind)} className={inputCls}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelCls}>Note</span>
                  <input value={payNote} onChange={(e) => setPayNote(e.target.value)} className={inputCls} />
                </label>
              </div>
              <p className="text-xs text-bark-soft">
                Le montant est réparti automatiquement sur les ventes impayées de ce client, de la plus ancienne à la plus récente.
              </p>
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className={btnPrimary}>
                  {busy ? 'Enregistrement…' : 'Enregistrer l’encaissement'}
                </button>
                <button type="button" className={btnGhost} onClick={() => setShowPay(false)}>Fermer</button>
              </div>
            </form>
          )}

          {/* Historique des ventes */}
          <div>
            <h4 className="font-display text-base font-semibold text-bark">Ventes ({selectedSales.length})</h4>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Canal</th>
                    <th className="py-3 pr-4">Total</th>
                    <th className="py-3 pr-4">Payé</th>
                    <th className="py-3 pr-4">Reste</th>
                    <th className="py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSales.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-bark-soft">Aucune vente.</td></tr>
                  )}
                  {selectedSales.map((s) => {
                    const reste = Math.max(0, s.total_fcfa - s.paid_amount)
                    const st = s.paid_amount >= s.total_fcfa ? 'Payée' : s.paid_amount > 0 ? 'Partielle' : 'À payer'
                    return (
                      <tr key={s.id} className="border-b border-line/60 last:border-0">
                        <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(s.date)}</td>
                        <td className="py-3 pr-4 text-bark-soft">{s.channel === 'ferme' ? 'Ferme' : 'Boutique'}</td>
                        <td className="py-3 pr-4 font-medium text-bark">{formatPrice(s.total_fcfa)}</td>
                        <td className="py-3 pr-4 text-leaf-dark">{formatPrice(s.paid_amount)}</td>
                        <td className={`py-3 pr-4 font-semibold ${reste > 0 ? 'text-terra-dark' : 'text-bark-soft'}`}>{formatPrice(reste)}</td>
                        <td className="py-3 text-bark-soft">{st}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historique des paiements */}
          <div>
            <h4 className="font-display text-base font-semibold text-bark">Paiements ({selectedPayments.length})</h4>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Montant</th>
                    <th className="py-3 pr-4">Moyen</th>
                    <th className="py-3 pr-4">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPayments.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-bark-soft">Aucun paiement.</td></tr>
                  )}
                  {selectedPayments.map((p) => (
                    <tr key={p.id} className="border-b border-line/60 last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-bark-soft">{fmtDateFr(p.date)}</td>
                      <td className="py-3 pr-4 font-semibold text-leaf-dark">{formatPrice(p.amount)}</td>
                      <td className="py-3 pr-4 text-bark-soft">{methodLabel(p.method)}</td>
                      <td className="py-3 pr-4 text-bark-soft">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
