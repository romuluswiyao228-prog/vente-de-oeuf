import { useMemo, useState } from 'react'
import {
  cancelOrderPayment,
  formatPrice,
  markOrderPaid,
  updateOrderStatus,
} from '../../lib/store'
import type { Order, OrderStatus, PaymentStatus } from '../../lib/types'
import { ORDER_STATUSES } from '../../lib/types'

interface Props {
  orders: Order[]
  refetch: () => void
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type PaymentFilter = 'tous' | PaymentStatus

export default function OrdersTab({ orders, refetch }: Props) {
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('tous')

  const visible = useMemo(
    () =>
      paymentFilter === 'tous'
        ? orders
        : orders.filter((o) => (o.payment_status ?? 'non_paye') === paymentFilter),
    [orders, paymentFilter],
  )

  // Tableau de bord : à encaisser = commandes non annulées non payées ;
  // ventes = uniquement les commandes payées ou livrées (hors annulées).
  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'annulee')
    const toCollect = active
      .filter((o) => (o.payment_status ?? 'non_paye') === 'non_paye')
      .reduce((n, o) => n + o.total_fcfa, 0)
    const sales = active
      .filter((o) => o.payment_status === 'paye' || o.status === 'livree')
      .reduce((n, o) => n + o.total_fcfa, 0)
    return { count: active.length, toCollect, sales }
  }, [orders])

  const markPaid = async (o: Order) => {
    const ref = window.prompt(
      'Référence de la transaction Mobile Money (facultatif) :',
      o.payment_ref ?? '',
    )
    if (ref === null) return
    try {
      await markOrderPaid(o.id, ref)
      refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Enregistrement impossible')
    }
  }

  const cancelPaid = async (o: Order) => {
    if (!window.confirm('Annuler l’enregistrement du paiement de cette commande ?')) return
    try {
      await cancelOrderPayment(o.id)
      refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Mise à jour impossible')
    }
  }

  return (
    <div className="space-y-6">
      {/* Compteurs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-bark-soft">Commandes actives</p>
          <p className="mt-2 font-display text-2xl font-semibold text-bark">{stats.count}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-bark-soft">À encaisser</p>
          <p className="mt-2 font-display text-2xl font-semibold text-terra-dark">
            {formatPrice(stats.toCollect)}
          </p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-bark-soft">
            Ventes (payées / livrées)
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-leaf-dark">
            {formatPrice(stats.sales)}
          </p>
        </div>
      </div>

      {/* Filtre par état de paiement */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="payment-filter" className="text-sm font-medium text-bark">
          Filtrer par paiement :
        </label>
        <select
          id="payment-filter"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
          className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-bark focus:border-terra focus:outline-none"
        >
          <option value="tous">Tous</option>
          <option value="non_paye">Non payés</option>
          <option value="paye">Payés</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-[2rem] bg-white shadow-card">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Client</th>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">Commande</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Paiement</th>
              <th className="px-5 py-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-bark-soft">
                  Aucune commande pour le moment.
                </td>
              </tr>
            )}
            {visible.map((o) => {
              const paid = o.payment_status === 'paye'
              return (
                <tr key={o.id} className="border-b border-line/60 align-top last:border-0">
                  <td className="px-5 py-4 whitespace-nowrap text-bark-soft">{fmtDate(o.created_at)}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-bark">
                      {o.customer_name}
                      {o.reference && <span className="ml-2 text-xs font-semibold text-terra-dark">#{o.reference}</span>}
                    </p>
                    {o.address && <p className="text-xs text-bark-soft">{o.address}{o.zone ? ` — ${o.zone}` : ''}</p>}
                    <p className="text-xs text-bark-soft">
                      {o.fulfillment === 'retrait' ? 'Retrait sur place' : 'Livraison'}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-bark-soft">
                    {o.phone && <p>{o.phone}</p>}
                    {o.email && <p className="text-xs">{o.email}</p>}
                  </td>
                  <td className="max-w-[220px] px-5 py-4 text-bark-soft">
                    {(Array.isArray(o.items) ? o.items : []).map((it, i) => (
                      <p key={i} className="truncate">
                        {it.quantity}× {it.name}
                      </p>
                    ))}
                  </td>
                  <td className="px-5 py-4 font-semibold text-terra-dark">{formatPrice(o.total_fcfa)}</td>
                  <td className="px-5 py-4">
                    <p className="text-bark-soft">
                      {o.payment_method === 'livraison' ? 'À la livraison' : 'Mobile Money'}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        paid ? 'bg-leaf-soft text-leaf-dark' : 'bg-terra-soft/60 text-terra-dark'
                      }`}
                    >
                      {paid ? 'Payé' : 'Non payé'}
                    </span>
                    {paid && (
                      <p className="mt-1 text-xs text-bark-soft">
                        {o.paid_at && `Payé le ${fmtDate(o.paid_at)}`}
                        {o.payment_ref && ` · Réf. ${o.payment_ref}`}
                      </p>
                    )}
                    <div className="mt-2">
                      {paid ? (
                        <button
                          type="button"
                          onClick={() => cancelPaid(o)}
                          className="btn rounded-full border border-line px-3 py-1 text-xs font-semibold text-bark-soft hover:border-terra-soft hover:text-terra-dark"
                        >
                          Annuler le paiement
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markPaid(o)}
                          className="btn rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-cream hover:opacity-90"
                        >
                          Marquer payé
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={o.status}
                      onChange={async (e) => {
                        await updateOrderStatus(o.id, e.target.value as OrderStatus)
                        refetch()
                      }}
                      className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-bark focus:border-terra focus:outline-none"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
