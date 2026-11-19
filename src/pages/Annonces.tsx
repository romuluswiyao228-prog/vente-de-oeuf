import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import { Link } from 'react-router-dom'
import { listings, animals } from '../data/catalog'

const races = ['Toutes', 'Marans', 'Poule Soie', 'Coucou de Malines', 'Arnaki', 'Canard de Rouen', 'Bantam', 'Gauloise', 'Coucou Hildebrand', 'Houdan']
const regions = ['Toutes', 'Bourgogne', 'Provence', 'Haute-Savoie', 'Loire', 'Camargue', 'Nord', 'Indre', 'Normandie', 'Centre-Val de Loire']
const shippingOptions = ['Colissimo', 'Chronopost', 'Retrait ferme']
const minRatings = [0, 4.5, 4.8]

const selectCls =
  'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-bark focus:border-terra focus:outline-none'

export default function Annonces() {
  const [params] = useSearchParams()
  const type = params.get('type')

  const [race, setRace] = useState('Toutes')
  const [region, setRegion] = useState('Toutes')
  const [shipping, setShipping] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [maxPrice, setMaxPrice] = useState(30)
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () =>
      listings.filter((l) => {
        if (race !== 'Toutes' && !l.race.toLowerCase().includes(race.toLowerCase())) return false
        if (region !== 'Toutes' && l.region !== region) return false
        if (minRating > 0 && l.rating < minRating) return false
        if (l.price > maxPrice) return false
        if (query && !`${l.title} ${l.race}`.toLowerCase().includes(query.toLowerCase())) return false
        if (shipping.length > 0 && !shipping.some((x) => l.shipping.some((y) => y.toLowerCase().includes(x.toLowerCase()))))
          return false
        return true
      }),
    [race, region, shipping, minRating, maxPrice, query],
  )

  const toggleShipping = (s: string) =>
    setShipping((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title={type === 'animaux' ? 'Animaux vivants' : 'Toutes les annonces'}
        subtitle={
          type === 'animaux'
            ? 'Poussins, poules et canards élevés en plein air — retrait à la ferme.'
            : 'Fertiles, poussins, volailles et matériel — filtrez par race, région, livraison et budget.'
        }
      />

      {type === 'animaux' ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {animals.map((a, i) => (
              <Reveal key={a.id} delay={i * 80}>
                <Link
                  to={`/annonces/${a.id}`}
                  className="card-lift group block overflow-hidden rounded-3xl bg-white shadow-card"
                >
                  <div className="card-zoom aspect-[4/3] overflow-hidden bg-sand">
                    <SmartImg src={a.image} seed={a.seed} alt={a.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-base font-semibold leading-snug text-bark group-hover:text-terra-dark">
                      {a.name}
                    </h2>
                    <p className="mt-1 text-xs text-bark-soft">
                      {a.breed} · {a.age} · {a.region}
                    </p>
                    <p className="mt-3 font-bold text-terra-dark">
                      {a.price} € <span className="text-xs font-normal text-bark-soft">{a.breeder}</span>
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <Reveal className="rounded-3xl bg-white p-6 shadow-card">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-bark-soft">Recherche</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Marans, couveuse…"
                  className={selectCls}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-bark-soft">Race</span>
                <select value={race} onChange={(e) => setRace(e.target.value)} className={selectCls}>
                  {races.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-bark-soft">Région</span>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectCls}>
                  {regions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-bark-soft">
                  Prix max : {maxPrice} €
                </span>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={1}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="mt-3 w-full accent-terra"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-6 border-t border-line pt-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-bark-soft">Livraison</p>
                <div className="flex flex-wrap gap-2">
                  {shippingOptions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleShipping(s)}
                      className={`btn rounded-full border px-4 py-1.5 text-sm font-medium ${
                        shipping.includes(s)
                          ? 'border-terra bg-terra text-cream'
                          : 'border-line bg-cream text-bark hover:border-terra-soft'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-bark-soft">Note vendeur</p>
                <div className="flex flex-wrap gap-2">
                  {minRatings.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMinRating(r)}
                      className={`btn rounded-full border px-4 py-1.5 text-sm font-medium ${
                        minRating === r
                          ? 'border-terra bg-terra text-cream'
                          : 'border-line bg-cream text-bark hover:border-terra-soft'
                      }`}
                    >
                      {r === 0 ? 'Toutes' : `≥ ${r.toFixed(1)}`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="ml-auto text-sm text-bark-soft">
                <strong className="text-bark">{filtered.length}</strong> annonce{filtered.length > 1 ? 's' : ''}
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 && (
              <p className="col-span-full rounded-3xl bg-white p-10 text-center text-bark-soft shadow-card">
                Aucune annonce ne correspond à vos filtres.{' '}
                <Link to="/demandes" className="font-semibold text-terra-dark underline">
                  Poster une demande
                </Link>{' '}
                et laissez les éleveurs venir à vous.
              </p>
            )}
            {filtered.map((l) => (
              <ProductCard key={l.id} listing={l} delay={0} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
