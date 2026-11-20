import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { useSiteTexts } from '../lib/store'

const links = [
  { to: '/annonces', label: 'Produits' },
  { to: '/incubation', label: 'Incubation' },
  { to: '/blog', label: 'Blog' },
  { to: '/faq', label: 'FAQ' },
]

export default function Header() {
  const texts = useSiteTexts()
  const { count } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-cream/90 shadow-[0_1px_0_0_var(--color-line)] backdrop-blur-md'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label={texts.site_name}>
          <HeaderLogo />
          <span className="font-display text-xl font-semibold tracking-tight text-bark">
            {texts.site_name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `btn rounded-full px-4 py-2 text-sm font-medium ${
                  isActive ? 'bg-terra-soft text-terra-dark' : 'text-bark-soft hover:bg-sand hover:text-bark'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CartButton count={count} className="hidden sm:grid" />
          {texts.whatsapp_number && (
            <a
              href={`https://wa.me/${texts.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn hidden rounded-full bg-terra px-5 py-2.5 text-sm font-semibold text-cream shadow-card hover:bg-terra-dark sm:inline-block"
            >
              Commander sur WhatsApp
            </a>
          )}
        </div>

        <button
          className="btn grid h-10 w-10 place-items-center rounded-full text-bark hover:bg-sand lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-cream px-4 pb-4 pt-2 lg:hidden" aria-label="Navigation mobile">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="block rounded-xl px-3 py-2.5 font-medium text-bark hover:bg-sand"
            >
              {l.label}
            </NavLink>
          ))}
          <CartButton count={count} className="mt-3 sm:hidden" />
          {texts.whatsapp_number && (
            <a
              href={`https://wa.me/${texts.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn mt-3 block rounded-full bg-terra px-4 py-2.5 text-center text-sm font-semibold text-cream"
            >
              Commander sur WhatsApp
            </a>
          )}
        </nav>
      )}
    </header>
  )
}

function CartButton({ count, className = '' }: { count: number; className?: string }) {
  return (
    <Link
      to="/panier"
      aria-label={count > 0 ? `Panier, ${count} article${count > 1 ? 's' : ''}` : 'Panier'}
      className={`btn relative grid h-10 w-10 place-items-center rounded-full text-bark hover:bg-sand ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 7h12l1.2 12.2a1.5 1.5 0 0 1-1.5 1.8H6.3a1.5 1.5 0 0 1-1.5-1.8L6 7z" />
        <path d="M9 10V6a3 3 0 0 1 6 0v4" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-terra px-1 text-[11px] font-bold text-cream">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

function HeaderLogo() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-terra text-cream shadow-card">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M12 3c3.2 0 6 4.7 6 8.7S15.2 20 12 20s-6-3.9-6-8.3S8.8 3 12 3zm0 3.4c-1.5 0-2.7 1.7-2.7 3.6s1.2 3.3 2.7 3.3 2.7-1.4 2.7-3.3-1.2-3.6-2.7-3.6z" />
      </svg>
    </span>
  )
}
