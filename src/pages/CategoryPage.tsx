import { Link, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import { categories, listings } from '../data/catalog'

export default function CategoryPage() {
  const { slug } = useParams()
  const category = categories.find((c) => c.slug === slug)

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-bark">Catégorie introuvable</h1>
        <Link to="/annonces" className="btn mt-6 inline-block rounded-full bg-terra px-6 py-3 text-sm font-semibold text-cream">
          Voir toutes les annonces
        </Link>
      </div>
    )
  }

  const items = listings.filter(
    (l) => l.category.toLowerCase().includes(category.name.toLowerCase().replace('Pondeuse', 'pondeuse')) || slug === 'pondeuse',
  )
  const shown = items.length > 0 ? items : listings.slice(0, 6)

  return (
    <>
      <section className="relative overflow-hidden">
        <SmartImg src={category.image} seed={77} alt={category.name} className="h-72 w-full object-cover sm:h-96" />
        <div className="absolute inset-0 bg-bark/50" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra-soft">Catégorie</p>
              <h1 className="mt-2 font-display text-4xl font-semibold text-cream sm:text-5xl">{category.name}</h1>
              <p className="mt-2 text-cream/85">
                {category.tagline} — {category.count} annonces
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((l, i) => (
            <ProductCard key={l.id} listing={l} delay={i * 80} />
          ))}
        </div>
      </section>
    </>
  )
}
