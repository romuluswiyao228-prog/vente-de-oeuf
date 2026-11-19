import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import ProductCard from '../components/ProductCard'
import { listings, animals } from '../data/catalog'

export default function AnnonceDetail() {
  const { id } = useParams()
  const listing = listings.find((l) => l.id === id)
  const animal = animals.find((a) => a.id === id)
  const similar = listings.filter((l) => l.id !== id).slice(0, 3)

  if (!listing && !animal) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-bark">Annonce introuvable</h1>
        <Link to="/annonces" className="btn mt-6 inline-block rounded-full bg-terra px-6 py-3 text-sm font-semibold text-cream">
          Retour aux annonces
        </Link>
      </div>
    )
  }

  if (animal) {
    return (
      <>
        <PageHeader eyebrow="Animal vivant" title={animal.name} subtitle={`${animal.breed} · ${animal.age} · ${animal.region}`} />
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <div className="overflow-hidden rounded-[2rem] shadow-card">
              <SmartImg src={animal.image} seed={animal.seed} alt={animal.name} className="aspect-[4/3] w-full object-cover" />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-4xl font-bold text-terra-dark">{animal.price} €</p>
            <p className="mt-2 text-bark-soft">
              Vendeur : <strong className="text-bark">{animal.breeder}</strong> — {animal.region}
            </p>
            <p className="mt-6 leading-relaxed text-bark-soft">
              {animal.breed} élevé en plein air par une famille d’éleveurs. Retrait à la ferme
              sur rendez-vous, ou expédition soignée pour les poussins de plus de 3 semaines.
              Certificat de vente et garantie santé 48 h inclus.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream hover:bg-terra-dark">
                Contacter l’éleveur
              </button>
              <Link
                to="/annonces"
                className="btn rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-bark hover:border-terra-soft"
              >
                Autres animaux
              </Link>
            </div>
          </Reveal>
        </section>
      </>
    )
  }

  const l = listing!
  return (
    <>
      <PageHeader eyebrow={`${l.race} · ${l.region}`} title={l.title} />
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <div className="card-zoom overflow-hidden rounded-[2rem] shadow-card">
            <SmartImg src={l.image} seed={l.seed} alt={l.title} className="aspect-[4/3] w-full object-cover" />
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-bold text-terra-dark">{l.price} €</p>
            <p className="text-sm text-bark-soft">{l.unit}</p>
          </div>
          <p className="mt-2 text-bark-soft">
            Vendeur : <strong className="text-bark">{l.breeder}</strong> — ★ {l.rating} ({l.reviews} avis)
          </p>
          <p className="mt-6 leading-relaxed text-bark-soft">{l.description}</p>

          <div className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-bark-soft">Options d’envoi</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {l.shipping.map((s) => (
                <span key={s} className="rounded-full bg-leaf-soft px-3 py-1.5 text-xs font-medium text-leaf-dark">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream hover:bg-terra-dark">
              Acheter ce lot
            </button>
            <button className="btn rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-bark hover:border-terra-soft">
              Poser une question
            </button>
          </div>
          <p className="mt-4 text-xs text-bark-soft">
            Paiement sécurisé — l’éleveur n’est payé qu’à la réception confirmée de votre colis.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6" aria-labelledby="similaires">
        <h2 id="similaires" className="font-display text-2xl font-semibold text-bark">
          Annonces similaires
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map((s) => (
            <ProductCard key={s.id} listing={s} delay={0} />
          ))}
        </div>
      </section>
    </>
  )
}
