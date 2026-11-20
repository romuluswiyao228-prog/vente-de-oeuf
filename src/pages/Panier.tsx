import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import { useCart } from '../lib/cart'
import { formatPrice, useProducts, useSiteTexts } from '../lib/store'
import { useSeo } from '../lib/seo'
import type { Product } from '../lib/types'

export default function Panier() {
  useSeo('Panier')
  const texts = useSiteTexts()
  const { lines, setQuantity, remove } = useCart()
  const products = useProducts()
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  // Ajuste les quantités si le stock a baissé ou si le produit a disparu
  useEffect(() => {
    for (const line of lines) {
      const product = byId.get(line.product_id)
      if (!product || product.stock <= 0) continue
      if (line.quantity > product.stock) setQuantity(line.product_id, product.stock)
    }
  }, [lines, byId, setQuantity])

  const resolved = lines
    .map((line) => ({ line, product: byId.get(line.product_id) ?? null }))
    .filter((r) => r.product !== null && r.product.stock > 0) as {
    line: (typeof lines)[number]
    product: Product
  }[]

  const unavailable = lines.filter((l) => {
    const p = byId.get(l.product_id)
    return !p || p.stock <= 0
  })

  const subtotal = resolved.reduce((n, r) => n + r.product.price_fcfa * r.line.quantity, 0)

  return (
    <>
      <PageHeader
        eyebrow="Commande"
        title="Votre panier"
        subtitle="Vérifiez vos articles avant de passer commande."
      />
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {unavailable.length > 0 && (
          <Reveal className="mb-6 rounded-2xl border border-terra/30 bg-terra-soft/40 px-5 py-4 text-sm text-bark">
            <p className="font-semibold text-terra-dark">Certains articles ne sont plus disponibles</p>
            <ul className="mt-2 space-y-1.5">
              {unavailable.map((l) => {
                const p = byId.get(l.product_id)
                return (
                  <li key={l.product_id} className="flex items-center justify-between gap-3">
                    <span className="text-bark-soft">
                      {p ? `${p.name} — rupture de stock` : 'Produit supprimé du catalogue'}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(l.product_id)}
                      className="btn shrink-0 text-sm font-semibold text-terra-dark hover:underline"
                    >
                      Retirer
                    </button>
                  </li>
                )
              })}
            </ul>
          </Reveal>
        )}

        {resolved.length === 0 ? (
          <Reveal className="rounded-[2rem] bg-white p-10 text-center shadow-card">
            <p className="font-display text-2xl font-semibold text-bark">Votre panier est vide</p>
            <p className="mt-2 text-bark-soft">Parcourez le catalogue pour trouver vos produits.</p>
            <Link
              to="/annonces"
              className="btn mt-6 inline-block rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream hover:bg-terra-dark"
            >
              Voir le catalogue
            </Link>
          </Reveal>
        ) : (
          <>
            <div className="space-y-4">
              {resolved.map(({ line, product }) => {
                const lineTotal = product.price_fcfa * line.quantity
                const insufficient = line.quantity > product.stock
                return (
                  <Reveal key={line.product_id} className="rounded-[2rem] bg-white p-5 shadow-card">
                    <div className="flex gap-4">
                      <Link
                        to={`/annonces/${product.id}`}
                        className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-sand sm:h-28 sm:w-28"
                      >
                        <SmartImg
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              to={`/annonces/${product.id}`}
                              className="font-display text-lg font-semibold text-bark hover:text-terra-dark"
                            >
                              {product.name}
                            </Link>
                            <p className="mt-0.5 text-sm text-bark-soft">
                              {formatPrice(product.price_fcfa)} / unité
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(line.product_id)}
                            className="btn shrink-0 text-sm font-medium text-bark-soft hover:text-terra-dark"
                            aria-label={`Retirer ${product.name} du panier`}
                          >
                            Supprimer
                          </button>
                        </div>
                        {insufficient && (
                          <p className="mt-2 text-sm font-medium text-terra-dark">
                            Stock insuffisant : {product.stock} disponible{product.stock > 1 ? 's' : ''}.
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-line bg-cream">
                            <button
                              type="button"
                              onClick={() => setQuantity(line.product_id, line.quantity - 1)}
                              className="btn px-3.5 py-1.5 text-lg text-bark"
                              aria-label={`Diminuer la quantité de ${product.name}`}
                            >
                              −
                            </button>
                            <span className="w-10 text-center text-sm font-semibold" aria-live="polite">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setQuantity(line.product_id, Math.min(line.quantity + 1, product.stock))
                              }
                              disabled={line.quantity >= product.stock}
                              className="btn px-3.5 py-1.5 text-lg text-bark disabled:opacity-40"
                              aria-label={`Augmenter la quantité de ${product.name}`}
                            >
                              +
                            </button>
                          </div>
                          <p className="font-semibold text-terra-dark">{formatPrice(lineTotal)}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>

            <Reveal className="mt-8 rounded-[2rem] bg-white p-8 shadow-card">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-semibold text-bark">Sous-total</p>
                <p className="text-2xl font-bold text-terra-dark">{formatPrice(subtotal)}</p>
              </div>
              <p className="mt-2 text-xs text-bark-soft">
                Les frais de livraison seront calculés à l'étape suivante.
              </p>
              <Link
                to="/commande"
                className="btn mt-6 block w-full rounded-full bg-terra px-6 py-4 text-center text-sm font-semibold text-cream hover:bg-terra-dark"
              >
                Passer la commande
              </Link>
              {texts.whatsapp_number && (
                <p className="mt-4 text-center text-xs text-bark-soft">
                  Une question ?{' '}
                  <a
                    href={`https://wa.me/${texts.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-terra-dark hover:underline"
                  >
                    Écrivez-nous sur WhatsApp
                  </a>
                </p>
              )}
            </Reveal>
          </>
        )}
      </section>
    </>
  )
}
