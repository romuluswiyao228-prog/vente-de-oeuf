import { Link } from 'react-router-dom'
import type { Product, ProductType } from '../lib/types'
import { PRODUCT_TYPES } from '../lib/types'
import { formatPrice } from '../lib/store'
import SmartImg from './SmartImg'
import Reveal from './Reveal'

export function typeLabel(type: ProductType): string {
  return PRODUCT_TYPES.find((t) => t.value === type)?.label ?? type
}

export default function ProductCard({ product, delay = 0 }: { product: Product; delay?: number }) {
  const image = product.images[0]
  const outOfStock = product.stock <= 0

  return (
    <Reveal delay={delay}>
      <Link
        to={`/annonces/${product.id}`}
        className="card-lift group block overflow-hidden rounded-3xl bg-white shadow-card"
      >
        <div className="card-zoom relative aspect-[4/3] overflow-hidden bg-sand">
          <SmartImg src={image} alt={product.name} className="h-full w-full object-cover" />
          {product.featured && (
            <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-xs font-semibold text-terra-dark shadow-card">
              À la une
            </span>
          )}
          {outOfStock && (
            <span className="absolute right-3 top-3 rounded-full bg-bark/80 px-3 py-1 text-xs font-semibold text-cream">
              Épuisé
            </span>
          )}
          <span className="absolute bottom-3 right-3 grid h-9 w-9 translate-x-1 place-items-center rounded-full bg-cream/95 text-bark opacity-0 shadow-card transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs text-bark-soft">
            <span className="rounded-full bg-leaf-soft px-2.5 py-1 font-medium text-leaf-dark">
              {typeLabel(product.type)}
            </span>
          </div>
          <h3 className="mt-2.5 font-display text-lg font-semibold leading-snug text-bark group-hover:text-terra-dark">
            {product.name}
          </h3>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-terra-dark">{formatPrice(product.price_fcfa)}</p>
              <p className="mt-0.5 text-xs text-bark-soft">
                {product.stock > 0 ? `${product.stock} en stock` : 'rupture de stock'}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </Reveal>
  )
}
