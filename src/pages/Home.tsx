import { Link } from 'react-router-dom'
import Marquee from '../components/Marquee'
import Hero from '../components/Hero'
import PhotoStrip from '../components/PhotoStrip'
import Reveal from '../components/Reveal'
import SectionHeading from '../components/SectionHeading'
import ProductCard from '../components/ProductCard'
import Newsletter from '../components/Newsletter'
import SmartImg from '../components/SmartImg'
import { SITE } from '../data/site'
import {
  categories,
  listings,
  newListings,
  requests,
  animals,
  gear,
  articles,
} from '../data/catalog'
import { img, VIDEOS } from '../lib/media'

const featured = listings.filter((l) => l.badge === 'À la une')

function Dot() {
  return <span className="mx-6 text-terra-soft/70">✦</span>
}

export default function Home() {
  return (
    <>
      {/* 1. Bandeau défilant */}
      <Marquee className="bg-terra py-2.5 text-cream">
        <span className="flex items-center px-6 text-[13px] font-medium tracking-wide">
          <strong className="font-bold">Fraîchement pondu</strong>
          <Dot />
          chez des <em className="italic">éleveurs vérifiés</em>
          <Dot />
          <strong className="font-bold">Livraison {SITE.zone}</strong>
          <Dot />
          <strong className="font-bold">Paiement sécurisé</strong>
          <Dot />
          <strong className="font-bold">Envoi soigné</strong>
          <Dot />
          <em className="italic font-semibold">0 % de commission éleveur</em>
        </span>
      </Marquee>

      {/* 3. Hero vidéo */}
      <Hero />

      {/* 4. Bande photos défilante */}
      <PhotoStrip />

      {/* 5. Catégories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="categories-title">
        <SectionHeading
          eyebrow="Trouver"
          title="Quel type de poule cherchez-vous ?"
          subtitle="De la pondeuse rustique à la race rare à préserver, chaque éleveur est vérifié et noté par la communauté."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 80}>
              <Link
                to={`/categories/${c.slug}`}
                className="card-lift group relative block aspect-[4/3] overflow-hidden rounded-3xl shadow-card"
              >
                <div className="card-zoom absolute inset-0">
                  <SmartImg src={c.image} seed={parseInt(c.slug.length + '9')} alt={c.name} className="h-full w-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-bark/80 via-bark/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-display text-2xl font-semibold text-cream">{c.name}</h3>
                  <p className="mt-1 text-sm text-cream/80">{c.tagline}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-terra-soft">
                    {c.count} annonces
                  </p>
                </div>
                <span className="absolute right-5 top-5 grid h-10 w-10 translate-x-2 place-items-center rounded-full bg-cream/90 text-bark opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 text-center">
          <Link
            to="/annonces"
            className="btn inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-bark shadow-card hover:border-terra hover:text-terra-dark"
          >
            Toutes les races
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </Reveal>
      </section>

      {/* 6. Histoire */}
      <section className="bg-sand/60 py-20 sm:py-24" aria-labelledby="histoire-title">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal className="relative">
            <div className="card-zoom overflow-hidden rounded-[2rem] shadow-card">
              <video
                className="aspect-[4/3] w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                aria-label="Une poule avec ses poussins"
              >
                <source src={VIDEOS.story.webm} type="video/webm" />
                <source src={VIDEOS.story.mov} type="video/quicktime" />
              </video>
            </div>
            {/* Collage de 3 photos */}
            <div className="absolute -bottom-8 -right-4 hidden w-56 flex-col gap-3 sm:flex">
              {[71, 72, 73].map((s) => (
                <div key={s} className="overflow-hidden rounded-2xl border-4 border-cream shadow-card">
                  <SmartImg src={img('chicken farm', s)} seed={s} alt="" className="h-20 w-full object-cover" />
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra">Notre histoire</p>
            <h2 id="histoire-title" className="mt-3 font-display text-3xl font-semibold leading-tight text-bark sm:text-4xl">
              Derrière chaque œuf, un éleveur passionné.
            </h2>
            <p className="mt-5 leading-relaxed text-bark-soft">
              Tout a commencé dans un petit jardin en Bourgogne, avec six poules et une
              couveuse bricolée. Aujourd’hui, {SITE.name} réunit des centaines d’éleveurs
              qui élèvent leurs volailles en plein air, avec respect et sans produit de
              synthèse.
            </p>
            <p className="mt-4 leading-relaxed text-bark-soft">
              Notre rôle : vérifier chaque éleveur, sécuriser chaque envoi et faire en sorte
              que vous trouviez exactement la race que vous cherchez — sans commission sur
              leurs ventes.
            </p>
            <div className="mt-8 flex items-center gap-8">
              <Link
                to="/annonces"
                className="btn rounded-full bg-terra px-6 py-3 text-sm font-semibold text-cream shadow-card hover:bg-terra-dark"
              >
                Découvrir nos éleveurs
              </Link>
              {/* Badge circulaire */}
              <div className="relative grid h-28 w-28 shrink-0 place-items-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-[spin_18s_linear_infinite]" aria-hidden="true">
                  <defs>
                    <path id="circlePath" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                  </defs>
                  <text className="fill-bark text-[10.5px] font-semibold uppercase tracking-[0.18em]">
                    <textPath href="#circlePath">100 % œufs suivis • éleveurs vérifiés •</textPath>
                  </text>
                </svg>
                <span className="grid h-14 w-14 place-items-center rounded-full bg-terra text-cream shadow-card">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.2 14.5L6 12l1.4-1.4 3.4 3.4 6-6L18 9.4l-7.2 7.1z" />
                  </svg>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. Sécurité */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="securite-title">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra">Confiance</p>
            <h2 id="securite-title" className="mt-3 font-display text-3xl font-semibold leading-tight text-bark sm:text-4xl">
              On sécurise chaque envoi, <em className="text-terra-dark">vraiment</em>.
            </h2>
            <ul className="mt-8 space-y-6">
              {[
                {
                  icon: (
                    <path d="M12 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14l-4.8 2.7.9-5.4L4.2 7.5l5.4-.8L12 1.8z" />
                  ),
                  title: 'Éleveurs vérifiés & notés',
                  text: 'Chaque éleveur est contrôlé et noté par les acheteurs. Les avis sont authentifiés après livraison.',
                },
                {
                  icon: (
                    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9zm9 8.7l6-4.4-1.2-1.6-4.8 3.6-4.8-3.6-1.2 1.6 6 4.4z" />
                  ),
                  title: 'Paiement sécurisé, éleveur payé à réception',
                  text: 'Votre paiement est conservé jusqu’à la confirmation de réception. CB, PayPal, virement : vous choisissez.',
                },
                {
                  icon: (
                    <path d="M12 2l8 3v6c0 5.2-3.4 9.6-8 11-4.6-1.4-8-5.8-8-11V5l8-3zm-1.2 13.5l5-5-1.4-1.4-3.6 3.6-1.6-1.6-1.4 1.4 3 3z" />
                  ),
                  title: 'Envoi soigné + preuves d’expédition',
                  text: 'Alvéoles renforcées, mentions fragiles, suivi Colissimo et photos du colis avant départ.',
                },
              ].map((p) => (
                <li key={p.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-leaf-soft text-leaf-dark">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      {p.icon}
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-semibold text-bark">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-bark-soft">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="overflow-hidden rounded-[2rem] shadow-card">
                <SmartImg
                  src={img('eggs package shipping', 81)}
                  seed={81}
                  alt="Œufs soigneusement emballés"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="absolute -left-4 -top-4 hidden w-40 overflow-hidden rounded-2xl border-4 border-cream shadow-card sm:block">
                <SmartImg src={img('chicken coop', 82)} seed={82} alt="" className="h-28 w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 right-6 w-44 overflow-hidden rounded-2xl border-4 border-cream shadow-card">
                <SmartImg src={img('eggs hands', 83)} seed={83} alt="" className="h-32 w-full object-cover" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8. Annonces à la une */}
      <section className="bg-sand/60 py-20 sm:py-24" aria-labelledby="une-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Sélection"
            title="Annonces à la une"
            subtitle="Les lots les plus demandés cette semaine, choisis par notre communauté d’éleveurs."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((l, i) => (
              <ProductCard key={l.id} listing={l} delay={i * 90} />
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <Link
              to="/annonces"
              className="btn inline-flex items-center gap-2 rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream shadow-card hover:bg-terra-dark"
            >
              Voir toutes les annonces
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 9. Derniers œufs publiés */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="recents-title">
        <SectionHeading
          eyebrow="Fraîchement pondu"
          title="Derniers œufs publiés"
          subtitle="Les nouvelles annonces des éleveurs, publiées ces derniers jours."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {newListings.map((l, i) => (
            <ProductCard key={l.id} listing={l} delay={i * 90} />
          ))}
        </div>
      </section>

      {/* 10. Pas trouvé ? */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6" aria-labelledby="demande-title">
        <Reveal className="rounded-[2rem] bg-bark px-6 py-14 text-center text-cream sm:px-12">
          <h2 id="demande-title" className="font-display text-3xl font-semibold sm:text-4xl">
            Pas trouvé ? Faites venir les éleveurs à vous.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/75">
            Décrivez ce que vous cherchez : les éleveurs de votre région vous font leurs offres.
          </p>
          <Link
            to="/demandes"
            className="btn mt-8 inline-block rounded-full bg-terra px-8 py-4 text-sm font-semibold text-cream shadow-lg hover:bg-terra-dark"
          >
            Poster une demande
          </Link>
          <div className="mx-auto mt-12 grid max-w-3xl gap-8 text-left sm:grid-cols-3">
            {[
              { n: '01', t: 'Décrivez', d: 'Race, quantité, budget, région : 2 minutes suffisent.' },
              { n: '02', t: 'Recevez des offres', d: 'Les éleveurs vérifiés de votre zone vous répondent.' },
              { n: '03', t: 'Choisissez & payez', d: 'Comparez, commandez, l’éleveur est payé à réception.' },
            ].map((s) => (
              <div key={s.n}>
                <p className="font-display text-4xl font-semibold text-terra-soft">{s.n}</p>
                <h3 className="mt-2 font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-cream/70">{s.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 11. Demandes en cours */}
      <section className="bg-leaf-soft/40 py-20 sm:py-24" aria-labelledby="demandes-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="En direct"
            title="Demandes en cours"
            subtitle="Ce que cherchent les autres éleveurs et futurs éleveurs en ce moment."
          />
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {requests.map((r, i) => (
              <Reveal key={r.id} delay={i * 80}>
                <Link
                  to="/demandes"
                  className="card-lift group flex h-full flex-col rounded-3xl bg-white p-6 shadow-card"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-full bg-terra-soft px-3 py-1 font-semibold text-terra-dark">
                      {r.offers} offres
                    </span>
                    <span className="text-bark-soft">{r.expiresIn}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold leading-snug text-bark group-hover:text-terra-dark">
                    {r.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-bark-soft">{r.detail}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wider text-bark-soft">
                    📍 {r.region}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Animaux vivants */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="animaux-title">
        <SectionHeading
          eyebrow="Retrait ferme"
          title="Animaux vivants"
          subtitle="Poussins, poules et canards élevés en plein air, à retirer à la ferme ou en point relais."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {animals.map((a, i) => (
            <Reveal key={a.id} delay={i * 80}>
              <Link
                to={`/annonces/${a.id}`}
                className="card-lift group block overflow-hidden rounded-3xl bg-white shadow-card"
              >
                <div className="card-zoom relative aspect-[4/3] overflow-hidden bg-sand">
                  <SmartImg src={a.image} seed={a.seed} alt={a.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-base font-semibold leading-snug text-bark group-hover:text-terra-dark">
                    {a.name}
                  </h3>
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

      {/* 13. Matériel & accessoires */}
      <section className="bg-sand/60 py-20 sm:py-24" aria-labelledby="materiel-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Pour bien commencer"
            title="Matériel & accessoires"
            subtitle="Couveuses, poulaillers, mangeoires : le nécessaire pour accueillir vos poussins."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {gear.map((g, i) => (
              <Reveal key={g.id} delay={i * 80}>
                <Link
                  to="/annonces"
                  className="card-lift group block overflow-hidden rounded-3xl bg-white shadow-card"
                >
                  <div className="card-zoom relative aspect-[4/3] overflow-hidden bg-sand">
                    <SmartImg src={g.image} seed={g.seed} alt={g.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-leaf-dark">
                      {g.kind}
                    </span>
                    <h3 className="mt-1.5 font-display text-base font-semibold leading-snug text-bark group-hover:text-terra-dark">
                      {g.name}
                    </h3>
                    <p className="mt-2 font-bold text-terra-dark">{g.price} €</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 14. Par envie */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="envie-title">
        <SectionHeading eyebrow="Par envie" title="Deux façons de commencer" />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              to: '/annonces?type=oeufs',
              title: 'Œufs fécondés',
              text: 'Des lots calibrés, marqués à la date de ponte, prêts pour votre couveuse.',
              image: img('eggs nest', 91),
              seed: 91,
            },
            {
              to: '/annonces?type=animaux',
              title: 'Animaux vivants',
              text: 'Poussins & volailles, retrait à la ferme. Le contact direct avec l’éleveur.',
              image: img('chicks farm', 92),
              seed: 92,
            },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 120}>
              <Link
                to={c.to}
                className="card-lift group relative block aspect-[16/10] overflow-hidden rounded-[2rem] shadow-card"
              >
                <div className="card-zoom absolute inset-0">
                  <SmartImg src={c.image} seed={c.seed} alt={c.title} className="h-full w-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-bark/85 via-bark/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <h3 className="font-display text-3xl font-semibold text-cream">{c.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-cream/85">{c.text}</p>
                  <span className="btn mt-5 inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-bark group-hover:bg-terra group-hover:text-cream">
                    Explorer
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 15. Blog */}
      <section className="bg-sand/60 py-20 sm:py-24" aria-labelledby="blog-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Le journal"
            title="Nos derniers articles"
            subtitle="Conseils d’éleveurs, guides d’incubation et retours d’expérience de la communauté."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {articles.map((a, i) => (
              <Reveal key={a.slug} delay={i * 100}>
                <Link
                  to={`/blog/${a.slug}`}
                  className="card-lift group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card"
                >
                  <div className="card-zoom aspect-[16/10] overflow-hidden bg-sand">
                    <SmartImg src={a.image} seed={a.seed} alt={a.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-xs text-bark-soft">
                      {a.date} · {a.readTime} de lecture
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-bark group-hover:text-terra-dark">
                      {a.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-bark-soft">{a.excerpt}</p>
                    <span className="mt-4 text-sm font-semibold text-terra-dark">Lire l’article →</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 16. Comment ça marche */}
      <section id="comment-ca-marche" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6" aria-labelledby="ccm-title">
        <SectionHeading
          eyebrow="Simple comme bonjour"
          title="Comment ça marche"
          subtitle="Trois étapes entre vous et vos premiers poussins."
        />
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            {
              n: '1',
              t: 'Trouvez vos œufs',
              d: 'Parcourez les annonces par race, région et budget. Chaque éleveur est vérifié et noté.',
              icon: 'M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
            },
            {
              n: '2',
              t: 'Commandez sereinement',
              d: 'Payez en ligne (CB, PayPal, virement). L’argent est conservé jusqu’à réception confirmée.',
              icon: 'M12 3l7 4v5c0 4.5-3 8.5-7 9.5-4-1-7-5-7-9.5V7l7-4z',
            },
            {
              n: '3',
              t: 'Recevez & couvez',
              d: 'Suivez votre colis, puis mettez vos fertiles en couveuse ou sous une poule couveuse.',
              icon: 'M4 20V10m4 10V4m4 16v-7m4 7V8m4 12v-4',
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="relative rounded-3xl bg-white p-8 text-center shadow-card">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-terra-soft text-terra-dark">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={s.icon} />
                  </svg>
                </span>
                <p className="mt-5 font-display text-4xl font-semibold text-terra-soft/60">{s.n}</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-bark">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-bark-soft">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 17. CTA Rejoignez le poulailler */}
      <section className="relative overflow-hidden py-24 sm:py-28" aria-labelledby="cta-title">
        <SmartImg
          src={img('chickens free range farm', 101)}
          seed={101}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-bark/55" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <h2 id="cta-title" className="font-display text-4xl font-semibold text-cream sm:text-5xl">
              Rejoignez le poulailler
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/85">
              Des œufs à couver ou des poussins déjà arrivés — il y en a pour tous les
              appétits et tous les budgets.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link
                to="/annonces"
                className="btn rounded-full bg-terra px-8 py-4 text-sm font-semibold text-cream shadow-lg hover:bg-terra-dark"
              >
                Parcourir les œufs
              </Link>
              <Link
                to="/demandes"
                className="btn rounded-full border border-cream/50 px-8 py-4 text-sm font-semibold text-cream hover:bg-cream/10"
              >
                Poster une demande
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 18. Newsletter */}
      <Newsletter />
    </>
  )
}
