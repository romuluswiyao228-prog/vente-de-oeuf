import { Link } from 'react-router-dom'
import { useMedia, useSiteTexts } from '../lib/store'

const nav = [
  { to: '/annonces', label: 'Produits' },
  { to: '/incubation', label: 'Incubation' },
  { to: '/blog', label: 'Blog' },
]

const support = [
  { to: '/contact', label: 'Contact' },
  { to: '/#comment-ca-marche', label: 'Comment ça marche' },
  { to: '/faq', label: 'FAQ' },
]

const legal = [
  { to: '/legal/conditions-vente', label: 'Conditions de vente' },
  { to: '/legal/conditions-utilisation', label: "Conditions d'utilisation" },
  { to: '/legal/reglementation-vendeur', label: 'Réglementation vendeur' },
  { to: '/legal/cookies', label: 'Cookies' },
]

function SocialIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const icons = {
  facebook: 'M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.6V13h2.7v8h3.2z',
  instagram:
    'M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zm5-9.7a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM12 4.2c-2.4 0-2.7 0-3.6.1a5 5 0 0 0-1.7.3 3.4 3.4 0 0 0-2 2 5 5 0 0 0-.3 1.7c-.1.9-.1 1.2-.1 3.6s0 2.7.1 3.6a5 5 0 0 0 .3 1.7 3.4 3.4 0 0 0 2 2 5 5 0 0 0 1.7.3c.9.1 1.2.1 3.6.1s2.7 0 3.6-.1a5 5 0 0 0 1.7-.3 3.4 3.4 0 0 0 2-2 5 5 0 0 0 .3-1.7c.1-.9.1-1.2.1-3.6s0-2.7-.1-3.6a5 5 0 0 0-.3-1.7 3.4 3.4 0 0 0-2-2 5 5 0 0 0-1.7-.3c-.9-.1-1.2-.1-3.6-.1zm0 2.1c2.4 0 2.6 0 3.6.1a3 3 0 0 1 1 .2 1.7 1.7 0 0 1 1 1 3 3 0 0 1 .2 1c.1 1 .1 1.3.1 3.6s0 2.6-.1 3.6a3 3 0 0 1-.2 1 1.7 1.7 0 0 1-1 1 3 3 0 0 1-1 .2c-1 .1-1.3.1-3.6.1s-2.6 0-3.6-.1a3 3 0 0 1-1-.2 1.7 1.7 0 0 1-1-1 3 3 0 0 1-.2-1c-.1-1-.1-1.3-.1-3.6s0-2.6.1-3.6a3 3 0 0 1 .2-1 1.7 1.7 0 0 1 1-1 3 3 0 0 1 1-.2c1-.1 1.3-.1 3.6-.1z',
  youtube:
    'M21.6 7.2a2.6 2.6 0 0 0-1.8-1.9C18.2 5 12 5 12 5s-6.2 0-7.8.3A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.9c1.6.3 7.8.3 7.8.3s6.2 0 7.8-.3a2.6 2.6 0 0 0 1.8-1.9A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z',
}

export default function Footer() {
  const texts = useSiteTexts()
  const logos = useMedia('logo')
  const logoUrl = logos[0]?.url
  const socials = [
    { key: 'facebook' as const, url: texts.social_facebook },
    { key: 'instagram' as const, url: texts.social_instagram },
    { key: 'youtube' as const, url: texts.social_youtube },
  ].filter((s) => s.url)

  return (
    <footer className="bg-bark text-cream/80">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={texts.site_name} width={40} height={40} className="h-10 w-10 rounded-2xl object-cover" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-terra text-cream">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M12 3c3.2 0 6 4.7 6 8.7S15.2 20 12 20s-6-3.9-6-8.3S8.8 3 12 3zm0 3.4c-1.5 0-2.7 1.7-2.7 3.6s1.2 3.3 2.7 3.3 2.7-1.4 2.7-3.3-1.2-3.6-2.7-3.6z" />
                  </svg>
                </span>
              )}
              <span className="font-display text-xl font-semibold text-cream">{texts.site_name}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">{texts.tagline}</p>
            {(texts.contact_email || texts.contact_phone || texts.contact_address) && (
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
                {texts.contact_email && <span className="block">{texts.contact_email}</span>}
                {texts.contact_phone && <span className="block">{texts.contact_phone}</span>}
                {texts.contact_address && <span className="block">{texts.contact_address}</span>}
              </p>
            )}
            {socials.length > 0 && (
              <div className="mt-5 flex gap-2">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.key}
                    className="btn grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream hover:bg-terra"
                  >
                    <SocialIcon d={icons[s.key]} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Navigation">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cream">Navigation</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {nav.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-terra-soft">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cream">Support</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {support.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-terra-soft">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Légal">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cream">Légal</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {legal.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-terra-soft">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-cream/10 pt-6 text-xs text-cream/50">
          © {new Date().getFullYear()} {texts.site_name} — {texts.contact_address}.
        </div>
      </div>
    </footer>
  )
}
