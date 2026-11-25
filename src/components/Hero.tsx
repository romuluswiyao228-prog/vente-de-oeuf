import { useState } from 'react'
import { Link } from 'react-router-dom'
import { canAutoplayVideo } from '../lib/perf'
import type { SiteTexts } from '../lib/types'
import Skeleton from './Skeleton'

interface HeroProps {
  texts: SiteTexts
  videoUrl?: string | null
  /** false tant que les textes réels ne sont pas disponibles (première visite). */
  textsReady?: boolean
}

export default function Hero({ texts, videoUrl, textsReady = true }: HeroProps) {
  // Pas d'autoplay sur connexions lentes (saveData) ni en reduced-motion :
  // on garde le fond terracotta uni.
  const [autoplay] = useState(canAutoplayVideo)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showVideo = !!videoUrl && autoplay && failedUrl !== videoUrl
  const videoType = videoUrl?.toLowerCase().endsWith('.mp4') ? 'video/mp4' : undefined

  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden bg-terra">
      {showVideo && videoUrl && (
        <video
          key={videoUrl}
          ref={(el) => {
            if (!el) return
            el.muted = true
            void el.play().catch(() => {})
          }}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay={autoplay}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setFailedUrl(videoUrl)}
        >
          <source src={videoUrl} type={videoType} />
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
              Élevage en plein air
            </span>
            <span className="text-cream/40">•</span>
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-terra-soft" fill="currentColor" aria-hidden="true">
                <path d="M10 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14l-4.8 2.7.9-5.4L4.2 7.5l5.4-.8L10 1.8z" />
              </svg>
              Paiement sécurisé
            </span>
          </div>

          {textsReady ? (
            <>
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
                Des produits sélectionnés avec soin, livrés à Lomé et dans tout le Togo.
              </p>
            </>
          ) : (
            <div aria-hidden="true">
              <Skeleton className="h-3 w-44 bg-cream/25" />
              <Skeleton className="mt-4 h-12 w-4/5 sm:h-16 lg:h-[4.5rem]" />
              <Skeleton className="mt-4 h-5 w-full max-w-md bg-cream/20" />
              <Skeleton className="mt-2 h-5 w-2/3 max-w-sm bg-cream/20" />
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Skeleton className="h-[3.25rem] w-44 rounded-full bg-cream/25" />
                <Skeleton className="h-[3.25rem] w-40 rounded-full bg-cream/15" />
              </div>
              <Skeleton className="mt-8 h-4 w-72 max-w-full bg-cream/15" />
            </div>
          )}
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
