import { useState } from 'react'
import { Link } from 'react-router-dom'
import { canAutoplayVideo } from '../lib/perf'
import { useSeo } from '../lib/seo'
import Marquee from '../components/Marquee'
import Hero from '../components/Hero'
import PhotoStrip from '../components/PhotoStrip'
import Reveal from '../components/Reveal'
import SectionHeading from '../components/SectionHeading'
import ProductCard from '../components/ProductCard'
import Newsletter from '../components/Newsletter'
import SmartImg from '../components/SmartImg'
import {
  useBlogPosts,
  useDeliveryZones,
  useMedia,
  usePaymentMethods,
  useProducts,
  useSiteTexts,
} from '../lib/store'
import { formatPrice } from '../lib/store'
import { PRODUCT_TYPES, type ProductType } from '../lib/types'

function Dot() {
  return <span className="mx-6 text-terra-soft/70">✦</span>
}

function TerracottaPanel({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-terra-soft ${className}`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 text-terra/50" fill="currentColor" aria-hidden="true">
        <path d="M32 8c8 0 15 11.5 15 21.5S40 52 32 52s-15-9.5-15-22.5S24 8 32 8z" />
      </svg>
    </div>
  )
}

export default function Home() {
  const [autoplayVideo] = useState(canAutoplayVideo)
  const [storyFailedUrl, setStoryFailedUrl] = useState<string | null>(null)
  useSeo()
  const texts = useSiteTexts()
  const heroVideos = useMedia('hero_video')
  const storyVideos = useMedia('story_video')
  const stripPhotos = useMedia('strip_photo')
  const ctaImages = useMedia('cta_image')
  const products = useProducts()
  const featured = products.filter((p) => p.featured)
  const latest = products.slice(0, 6)
  const animals = products.filter((p) => ['poules', 'poussins', 'canards'].includes(p.type))
  const materiel = products.filter((p) => p.type === 'materiel')
  const oeufs = products.filter((p) => p.type === 'oeufs')
  const posts = useBlogPosts().slice(0, 3)
  const zones = useDeliveryZones()
  const payments = usePaymentMethods()

  const counts = Object.fromEntries(
    PRODUCT_TYPES.map((t) => [t.value, products.filter((p) => p.type === t.value).length]),
  ) as Record<ProductType, number>

  const marqueeItems = texts.marquee.split('|').map((s) => s.trim()).filter(Boolean)
  const firstOeuf = oeufs[0]
  const firstAnimal = animals[0]

  const deliveryText = zones.length > 0 ? zones.map((z) => z.name).join(', ') : 'Togo'

  return (
    <>
      {/* 1. Bandeau défilant */}
      {marqueeItems.length > 0 && (
        <Marquee className="bg-terra py-2.5 text-cream">
          <span className="flex items-center px-6 text-[13px] font-medium tracking-wide">
            {marqueeItems.map((item, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <Dot />}
                {i % 2 === 0 ? <strong className="font-bold">{item}</strong> : <em className="italic">{item}</em>}
              </span>
            ))}
          </span>
        </Marquee>
      )}

      {/* 3. Hero vidéo */}
      <Hero texts={texts} videoUrl={heroVideos[0]?.url} />

      {/* 4. Bande photos défilante */}
      <PhotoStrip photos={stripPhotos} />

      {/* 5. Catégories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="categories-title">
        <SectionHeading
          eyebrow="Trouver"
          title="Que cherchez-vous ?"
          subtitle="Œufs fécondés, volailles ou matériel : parcourez notre catalogue et commandez en un clic sur WhatsApp."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_TYPES.map((t, i) => (
            <Reveal key={t.value} delay={i * 80}>
              <Link
                to={`/annonces?type=${t.value}`}
                className="card-lift group relative block aspect-[4/3] overflow-hidden rounded-3xl shadow-card"
              >
                <div className="card-zoom absolute inset-0">
                  <SmartImg src={products.find((p) => p.type === t.value)?.images[0]} alt={t.label} className="h-full w-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-bark/80 via-bark/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-display text-2xl font-semibold text-cream">{t.label}</h3>
                  <p className="mt-1 text-sm text-cream/80">{t.tagline}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-terra-soft">
                    {counts[t.value]} produit{counts[t.value] > 1 ? 's' : ''}
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
            Tous les produits
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
            {storyVideos[0]?.url && autoplayVideo && storyFailedUrl !== storyVideos[0].url ? (
              <div className="card-zoom overflow-hidden rounded-[2rem] shadow-card">
                <video
                  key={storyVideos[0].url}
                  ref={(el) => {
                    if (!el) return
                    el.muted = true
                    void el.play().catch(() => {})
                  }}
                  className="aspect-[4/3] w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Une poule avec ses poussins"
                  onError={() => setStoryFailedUrl(storyVideos[0].url)}
                >
                  <source
                    src={storyVideos[0].url}
                    type={storyVideos[0].url.toLowerCase().endsWith('.mp4') ? 'video/mp4' : undefined}
                  />
                </video>
              </div>
            ) : (
              <TerracottaPanel className="aspect-[4/3] rounded-[2rem] shadow-card" />
            )}
            <div className="absolute -bottom-8 -right-4 hidden w-56 flex-col gap-3 sm:flex">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl border-4 border-cream shadow-card">
                  <SmartImg
                    src={animals[i]?.images[0] ?? oeufs[i]?.images[0]}
                    alt=""
                    className="h-20 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra">Notre histoire</p>
            <h2 id="histoire-title" className="mt-3 font-display text-3xl font-semibold leading-tight text-bark sm:text-4xl">
              Derrière chaque œuf, une basse-cour.
            </h2>
            <p className="mt-5 leading-relaxed text-bark-soft">
              {texts.site_name} est née d’une passion simple : élever des volailles en plein
              air et partager de beaux œufs fertiles, des poussins vigoureux et du bon
              matériel avec des familles de tout le Togo.
            </p>
            <p className="mt-4 leading-relaxed text-bark-soft">
              Nous préparons chaque commande avec soin et livrons à {deliveryText}.
              Commandez sur WhatsApp, payez par Mobile Money ou à la livraison.
            </p>
            <div className="mt-8 flex items-center gap-8">
              <Link
                to="/annonces"
                className="btn rounded-full bg-terra px-6 py-3 text-sm font-semibold text-cream shadow-card hover:bg-terra-dark"
              >
                Voir le catalogue
              </Link>
              <div className="relative grid h-28 w-28 shrink-0 place-items-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-[spin_18s_linear_infinite]" aria-hidden="true">
                  <defs>
                    <path id="circlePath" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                  </defs>
                  <text className="fill-bark text-[10.5px] font-semibold uppercase tracking-[0.18em]">
                    <textPath href="#circlePath">100 % suivi • paiement sécurisé •</textPath>
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
              On sécurise chaque commande, <em className="text-terra-dark">vraiment</em>.
            </h2>
            <ul className="mt-8 space-y-6">
              {[
                {
                  icon: 'M12 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14l-4.8 2.7.9-5.4L4.2 7.5l5.4-.8L12 1.8z',
                  title: 'Produits vérifiés & qualifiés',
                  text: 'Chaque lot est contrôlé avant expédition : date de ponte, calibrage, état des coquilles.',
                },
                {
                  icon: 'M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9zm9 8.7l6-4.4-1.2-1.6-4.8 3.6-4.8-3.6-1.2 1.6 6 4.4z',
                  title: 'Paiement sécurisé',
                  text: 'Mobile Money (T-Money, Flooz) ou paiement à la livraison : vous choisissez ce qui vous arrange.',
                },
                {
                  icon: 'M12 2l8 3v6c0 5.2-3.4 9.6-8 11-4.6-1.4-8-5.8-8-11V5l8-3zm-1.2 13.5l5-5-1.4-1.4-3.6 3.6-1.6-1.6-1.4 1.4 3 3z',
                  title: 'Envoi soigné',
                  text: 'Emballage renforcé pour les œufs, suivi de livraison et confirmation WhatsApp à chaque étape.',
                },
              ].map((p) => (
                <li key={p.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-leaf-soft text-leaf-dark">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                      <path d={p.icon} />
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
              <div className="overflow-hidden rounded-[2rem] bg-terra-soft shadow-card">
                <SmartImg
                  src={products.find((p) => p.images.length > 0)?.images[0]}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 right-6 flex items-center gap-3 rounded-2xl bg-cream px-5 py-4 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-terra text-cream">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.2 14.5L6 12l1.4-1.4 3.4 3.4 6-6L18 9.4l-7.2 7.1z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-bark">100 % suivi</p>
                  <p className="text-xs text-bark-soft">De la ponte à la livraison</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8. À la une */}
      {featured.length > 0 && (
        <section className="bg-sand/60 py-20 sm:py-24" aria-labelledby="une-title">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Sélection"
              title="Produits à la une"
              subtitle="Nos coups de cœur, choisis pour leur qualité et leur popularité."
            />
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, 3).map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i * 90} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 9. Derniers produits */}
      {latest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="recents-title">
          <SectionHeading
            eyebrow="Nouveautés"
            title="Derniers produits"
            subtitle="Les nouveautés de notre basse-cour, ajoutées récemment."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i * 90} />
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <Link
              to="/annonces"
              className="btn inline-flex items-center gap-2 rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream shadow-card hover:bg-terra-dark"
            >
              Voir tout le catalogue
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </Reveal>
        </section>
      )}

      {/* 12. Animaux vivants */}
      {animals.length > 0 && (
        <section className="bg-leaf-soft/40 py-20 sm:py-24" aria-labelledby="animaux-title">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Animaux vivants"
              title="Poules, poussins & canards"
              subtitle="Volailles élevées en plein air, disponibles en retrait ou en livraison soignée."
            />
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {animals.slice(0, 4).map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i * 80} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 13. Matériel */}
      {materiel.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="materiel-title">
          <SectionHeading
            eyebrow="Pour bien commencer"
            title="Matériel & accessoires"
            subtitle="Couveuses, mangeoires et tout le nécessaire pour votre basse-cour."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {materiel.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i * 80} />
            ))}
          </div>
        </section>
      )}

      {/* 14. Par envie */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="envie-title">
        <SectionHeading eyebrow="Par envie" title="Deux façons de commencer" />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              to: '/annonces?type=oeufs',
              title: 'Œufs fécondés',
              text: 'Des lots calibrés, marqués à la date de ponte, prêts pour votre couveuse.',
              image: firstOeuf?.images[0],
            },
            {
              to: '/annonces?type=poussins',
              title: 'Animaux vivants',
              text: 'Poussins & volailles élevés en plein air, à emporter ou en livraison.',
              image: firstAnimal?.images[0],
            },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 120}>
              <Link
                to={c.to}
                className="card-lift group relative block aspect-[16/10] overflow-hidden rounded-[2rem] shadow-card"
              >
                <div className="card-zoom absolute inset-0">
                  <SmartImg src={c.image} alt={c.title} className="h-full w-full object-cover" />
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
      {posts.length > 0 && (
        <section className="bg-sand/60 py-20 sm:py-24" aria-labelledby="blog-title">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Le journal"
              title="Nos derniers articles"
              subtitle="Conseils d’élevage, guides d’incubation et retours d’expérience."
            />
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {posts.map((a, i) => (
                <Reveal key={a.id} delay={i * 100}>
                  <Link
                    to={`/blog/${a.slug}`}
                    className="card-lift group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card"
                  >
                    <div className="card-zoom aspect-[16/10] overflow-hidden bg-sand">
                      <SmartImg src={a.image_url} alt={a.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-xs text-bark-soft">
                        {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
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
      )}

      {/* Livraison & paiement récap */}
      {(zones.length > 0 || payments.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <Reveal className="grid gap-6 rounded-[2rem] bg-white p-8 shadow-card sm:grid-cols-2 sm:p-10">
            {zones.length > 0 && (
              <div>
                <h3 className="font-display text-xl font-semibold text-bark">Livraison</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-bark-soft">
                  {zones.map((z) => (
                    <li key={z.id} className="flex justify-between gap-4">
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
                <h3 className="font-display text-xl font-semibold text-bark">Paiement</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-bark-soft">
                  {payments.map((p) => (
                    <li key={p.id}>
                      <span className="font-medium text-bark">{p.label}</span>
                      {p.details && <span> — {p.details}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>
        </section>
      )}

      {/* 16. Comment ça marche */}
      <section id="comment-ca-marche" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6" aria-labelledby="ccm-title">
        <SectionHeading
          eyebrow="Simple comme bonjour"
          title="Comment ça marche"
          subtitle="Trois étapes entre vous et votre commande."
        />
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            {
              n: '1',
              t: 'Choisissez vos produits',
              d: 'Parcourez le catalogue par type et quantité. Chaque fiche indique le prix en FCFA et le stock.',
              icon: 'M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
            },
            {
              n: '2',
              t: 'Commandez sur WhatsApp',
              d: 'Un clic ouvre WhatsApp avec votre commande pré-remplie. On confirme ensemble la livraison et le paiement.',
              icon: 'M12 3l7 4v5c0 4.5-3 8.5-7 9.5-4-1-7-5-7-9.5V7l7-4z',
            },
            {
              n: '3',
              t: 'Recevez & profitez',
              d: 'Livraison à Lomé et dans tout le Togo, ou retrait sur place. Paiement Mobile Money ou à la livraison.',
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

      {/* 17. CTA */}
      <section className="relative overflow-hidden py-24 sm:py-28" aria-labelledby="cta-title">
        {ctaImages[0]?.url ? (
          <SmartImg src={ctaImages[0].url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-terra" />
        )}
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
                to="/contact"
                className="btn rounded-full border border-cream/50 px-8 py-4 text-sm font-semibold text-cream hover:bg-cream/10"
              >
                Nous contacter
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
