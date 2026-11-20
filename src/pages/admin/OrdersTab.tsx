import { updateOrderStatus, formatPrice } from '../../lib/store'
import type { Order, OrderStatus } from '../../lib/types'
import { ORDER_STATUSES } from '../../lib/types'

interface Props {
  orders: Order[]
  refetch: () => void
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function OrdersTab({ orders, refetch }: Props) {
  return (
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
          {orders.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-bark-soft">
                Aucune commande pour le moment.
              </td>
            </tr>
          )}
          {orders.map((o) => (
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
              <td className="px-5 py-4 text-bark-soft">{o.payment_method === 'livraison' ? 'À la livraison' : 'Mobile Money'}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
