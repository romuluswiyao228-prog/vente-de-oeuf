import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Panier : ne stocke en localStorage que product_id + quantité.
 * Prix et stock sont toujours relus depuis la base au moment de l'affichage.
 */
export interface CartLine {
  product_id: string
  quantity: number
}

const STORAGE_KEY = 'lb-cart'

function readLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (l): l is CartLine =>
          typeof l === 'object' &&
          l !== null &&
          typeof (l as CartLine).product_id === 'string' &&
          Number.isInteger((l as CartLine).quantity) &&
          (l as CartLine).quantity > 0,
      )
      .map((l) => ({ product_id: l.product_id, quantity: Math.min(l.quantity, 999) }))
  } catch {
    return []
  }
}

function writeLines(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  } catch {
    /* stockage indisponible : le panier reste en mémoire */
  }
}

interface CartContextValue {
  lines: CartLine[]
  /** Nombre total d'articles (somme des quantités) */
  count: number
  add: (productId: string, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readLines)

  useEffect(() => writeLines(lines), [lines])

  const value = useMemo<CartContextValue>(() => {
    const update = (fn: (prev: CartLine[]) => CartLine[]) => setLines(fn)
    return {
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add: (productId, quantity = 1) =>
        update((prev) => {
          const existing = prev.find((l) => l.product_id === productId)
          if (existing) {
            return prev.map((l) =>
              l.product_id === productId ? { ...l, quantity: Math.min(l.quantity + quantity, 999) } : l,
            )
          }
          return [...prev, { product_id: productId, quantity: Math.max(1, quantity) }]
        }),
      setQuantity: (productId, quantity) =>
        update((prev) =>
          quantity <= 0
            ? prev.filter((l) => l.product_id !== productId)
            : prev.map((l) =>
                l.product_id === productId ? { ...l, quantity: Math.min(quantity, 999) } : l,
              ),
        ),
      remove: (productId) => update((prev) => prev.filter((l) => l.product_id !== productId)),
      clear: () => setLines([]),
    }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé dans un CartProvider')
  return ctx
}
