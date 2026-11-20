import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import ProductCard, { typeLabel } from '../components/ProductCard'
import { useCart } from '../lib/cart'
import { useSeo } from '../lib/seo'
import { useDeliveryZones, usePaymentMethods, useProduct, useProducts, useSiteTexts, orderMessage, whatsappLink, formatPrice } from '../lib/store'

export default function AnnonceDetail() {
  const { id } = useParams()
  const product = useProduct(id)
  const texts = useSiteTexts()
  const zones = useDeliveryZones()
  const payments = usePaymentMethods()
  const all = useProducts()
  const similar = all.filter((p) => p.id !== id && p.type === product?.type).slice(0, 3)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const { add } = useCart()

  useSeo(product?.name, product?.description)

  // Garde la quantité dans les limites du stock
  useEffect(() => {
    if (product && quantity > product.stock) setQuantity(Math.max(1, product.stock))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, product?.stock])

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-bark">Produit introuvable</h1>
        <Link to="/annonces" className="btn mt-6 inline-block rounded-full bg-terra px-6 py-3 text-sm font-semibold text-cream">
          Retour au catalogue
        </Link>
      </div>
    )
  }

  const outOfStock = product.stock <= 0
  const waHref = product && texts.whatsapp_number
    ? whatsappLink(texts.whatsapp_number, orderMessage(product, quantity, texts))
    : null

  return (
    <>
      <PageHeader eyebrow={typeLabel(product.type)} title={product.name} />
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <div className="card-zoom overflow-hidden rounded-[2rem] shadow-card">
            <SmartImg
              src={product.images[activeImage]}
              alt={product.name}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                    i === activeImage ? 'border-terra' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Photo ${i + 1}`}
                >
                  <SmartImg src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Reveal>

        <Reveal delay={120}>
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-4xl font-bold text-terra-dark">{formatPrice(product.price_fcfa)}</p>
            {product.featured && (
              <span className="rounded-full bg-terra-soft px-3 py-1 text-xs font-semibold text-terra-dark">
                À la une
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-bark-soft">
            {outOfStock ? (
              <span className="font-semibold text-terra-dark">Rupture de stock</span>
            ) : (
              <span>{product.stock} en stock</span>
            )}
          </p>

          {product.description && (
            <p className="mt-6 whitespace-pre-line leading-relaxed text-bark-soft">{product.description}</p>
          )}

          {!outOfStock && (
            <div className="mt-6 flex items-center gap-4">
              <span className="text-sm font-medium text-bark">Quantité</span>
              <div className="flex items-center rounded-full border border-line bg-cream">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="btn px-4 py-2 text-lg text-bark"
                  aria-label="Diminuer"
                >
                  −
                </button>
                <span className="w-10 text-center font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                  className="btn px-4 py-2 text-lg text-bark"
                  aria-label="Augmenter"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-bark-soft">
                Total : <strong className="text-terra-dark">{formatPrice(product.price_fcfa * quantity)}</strong>
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                add(product.id, quantity)
                setAdded(true)
                setTimeout(() => setAdded(false), 2500)
              }}
              className={`btn inline-flex items-center gap-2.5 rounded-full px-7 py-4 text-sm font-semibold shadow-card ${
                outOfStock
                  ? 'cursor-not-allowed bg-line text-bark-soft'
                  : 'bg-bark text-cream hover:bg-terra-dark'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 7h12l1.2 12.2a1.5 1.5 0 0 1-1.5 1.8H6.3a1.5 1.5 0 0 1-1.5-1.8L6 7z" />
                <path d="M9 10V6a3 3 0 0 1 6 0v4" />
              </svg>
              {outOfStock ? 'Rupture de stock' : added ? 'Ajouté au panier ✓' : 'Ajouter au panier'}
            </button>
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className={`btn inline-flex items-center gap-2.5 rounded-full px-7 py-4 text-sm font-semibold shadow-card ${
                  outOfStock ? 'pointer-events-none bg-line text-bark-soft' : 'bg-terra text-cream hover:bg-terra-dark'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.7 3 .6.9-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
                </svg>
                {outOfStock ? 'Indisponible' : 'Commander sur WhatsApp'}
              </a>
            ) : (
              !outOfStock && (
                <p className="rounded-2xl bg-sand px-5 py-4 text-sm text-bark-soft">
                  Le bouton de commande sera disponible prochainement.
                </p>
              )
            )}
            {added && !outOfStock && (
              <Link
                to="/panier"
                className="btn inline-flex items-center gap-2 rounded-full border border-line bg-cream px-7 py-4 text-sm font-semibold text-bark hover:border-terra-soft"
              >
                Voir le panier
              </Link>
            )}
          </div>

          {(zones.length > 0 || payments.length > 0) && (
            <div className="mt-8 grid gap-4 rounded-3xl bg-sand/60 p-5 sm:grid-cols-2">
              {zones.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-bark-soft">Livraison</h2>
                  <ul className="mt-2 space-y-1 text-sm text-bark-soft">
                    {zones.map((z) => (
                      <li key={z.id} className="flex justify-between gap-3">
                        <span>{z.name}</span>
                        <span className="font-medium text-bark">
                          {z.fee_fcfa === 0 ? 'Gratuite' : formatPrice(z.fee_fcfa)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {payments.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-bark-soft">Paiement</h2>
                  <ul className="mt-2 space-y-1 text-sm text-bark-soft">
                    {payments.map((p) => (
                      <li key={p.id}>
                        <span className="font-medium text-bark">{p.label}</span>
                        {p.details && <span> — {p.details}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Reveal>
      </section>

      {similar.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6" aria-labelledby="similaires">
          <h2 id="similaires" className="font-display text-2xl font-semibold text-bark">
            Produits similaires
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} delay={0} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
