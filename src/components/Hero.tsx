import { Link } from 'react-router-dom'
import type { SiteTexts } from '../lib/types'

interface HeroProps {
  texts: SiteTexts
  videoUrl?: string | null
}

export default function Hero({ texts, videoUrl }: HeroProps) {
  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden bg-terra">
      {videoUrl && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src={videoUrl} />
        </video>
      )}
      <div className="absolute inset-0 bg-bark/45" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
        <div className="max-w-2xl">
          <div className="reveal is-visible mb-6 inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full border border-cream/30 bg-cream/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-terra-soft" fill="currentColor" aria-hidden="true">
                <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
              </svg>
              Éleveurs vérifiés
            </span>
            <span className="text-cream/40">•</span>
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-terra-soft" fill="currentColor" aria-hidden="true">
                <path d="M10 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14l-4.8 2.7.9-5.4L4.2 7.5l5.4-.8L10 1.8z" />
              </svg>
              Paiement sécurisé
            </span>
          </div>

          <p className="reveal is-visible text-sm font-semibold uppercase tracking-[0.25em] text-terra-soft">
            {texts.hero_eyebrow}
          </p>
          <h1 className="reveal is-visible mt-3 font-display text-4xl font-semibold leading-[1.08] text-cream sm:text-5xl lg:text-6xl">
            {texts.hero_title}
          </h1>
          <p className="reveal is-visible mt-6 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
            {texts.hero_subtitle}
          </p>

          <div className="reveal is-visible mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/annonces"
              className="btn rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream shadow-lg hover:bg-terra-dark"
            >
              {texts.hero_cta_primary}
            </Link>
            <a
              href="#comment-ca-marche"
              className="btn rounded-full border border-cream/40 px-7 py-3.5 text-sm font-semibold text-cream hover:bg-cream/10"
            >
              {texts.hero_cta_secondary}
            </a>
          </div>

          <p className="reveal is-visible mt-8 text-sm text-cream/70">
            Vous élevez ?{' '}
            <Link to="/annonces" className="font-semibold text-terra-soft underline-offset-4 hover:underline">
              Découvrez nos produits
            </Link>
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-cream/60" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="animate-float h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6" />
        </svg>
      </div>
    </section>
  )
}
