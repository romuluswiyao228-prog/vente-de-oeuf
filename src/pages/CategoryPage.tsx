import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import { useProducts } from '../lib/store'
import { useSeo } from '../lib/seo'
import { PRODUCT_TYPES, type ProductType } from '../lib/types'

export default function CategoryPage() {
  const { slug } = useParams()
  const type = PRODUCT_TYPES.find((t) => t.value === slug)
  useSeo(type?.label)
  const products = useProducts(slug && PRODUCT_TYPES.some((t) => t.value === slug) ? (slug as ProductType) : undefined)

  if (!type) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-bark">Catégorie introuvable</h1>
        <Link to="/annonces" className="btn mt-6 inline-block rounded-full bg-terra px-6 py-3 text-sm font-semibold text-cream">
          Voir tout le catalogue
        </Link>
      </div>
    )
  }

  return (
    <>
      <PageHeader eyebrow="Catégorie" title={type.label} subtitle={type.tagline} />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {products.length === 0 ? (
          <p className="rounded-3xl bg-white p-10 text-center text-bark-soft shadow-card">
            Aucun produit dans cette catégorie pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i * 80} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
