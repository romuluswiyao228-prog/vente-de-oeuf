import type { OrderItem, OrderFulfillment } from './types'

/** Instantané de la commande affiché sur la page de confirmation (sessionStorage). */
export interface LastOrder {
  id: string
  reference: string
  created_at: string
  customer_name: string
  phone: string
  email: string
  fulfillment: OrderFulfillment
  zone: string
  address: string
  items: OrderItem[]
  subtotal_fcfa: number
  delivery_fee_fcfa: number
  total_fcfa: number
  payment_label: string
  payment_details: string
  note: string
}

const KEY = 'lb-last-order'

export function saveLastOrder(order: LastOrder) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order))
  } catch {
    /* ignore */
  }
}

export function readLastOrder(): LastOrder | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LastOrder) : null
  } catch {
    return null
  }
}

export function clearLastOrder() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
