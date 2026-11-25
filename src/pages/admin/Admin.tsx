import { lazy, Suspense, useState, type FormEvent } from 'react'
import { adminSignIn, adminSignOut, adminSignUp, useAdminSession } from '../../lib/store'
import ProductsTab from './ProductsTab'
import MediaTab from './MediaTab'
import TextsTab from './TextsTab'
import DeliveryTab from './DeliveryTab'
import OrdersTab from './OrdersTab'
import BlogTab from './BlogTab'
import CategoriesTab from './CategoriesTab'
import FarmTab from './FarmTab'
import Skeleton from '../../components/Skeleton'
import { useAdminData, parseHiddenTypes } from '../../lib/store'
import { farmAlertCount, useFarmData } from '../../lib/farm'

const DashboardHome = lazy(() => import('./DashboardHome'))

type FarmSub = 'production' | 'ventes' | 'clients' | 'oeufs' | 'animaux' | 'incubation' | 'appro' | 'depenses' | 'caisse' | 'rappels'

const sections = [
  {
    title: 'Pilotage',
    items: [{ id: 'tableau', label: 'Tableau de bord' }],
  },
  {
    title: 'Boutique',
    items: [
      { id: 'produits', label: 'Produits' },
      { id: 'categories', label: 'Catégories' },
      { id: 'commandes', label: 'Commandes' },
      { id: 'livraison', label: 'Livraison & Paiement' },
    ],
  },
  {
    title: 'Contenu du site',
    items: [
      { id: 'medias', label: 'Médias' },
      { id: 'textes', label: 'Textes' },
      { id: 'blog', label: 'Blog' },
    ],
  },
  {
    title: 'Ferme',
    items: [{ id: 'ferme', label: 'Ferme', badge: true }],
  },
]

export default function Admin() {
  const { session, isAdmin, configured } = useAdminSession()
  const data = useAdminData()
  const farm = useFarmData()
  const [tab, setTab] = useState('tableau')
  const [farmSub, setFarmSub] = useState<{ sub: FarmSub; nonce: number } | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'login') {
        await adminSignIn(email, password)
      } else {
        const result = await adminSignUp(email, password, fullName)
        if (result === 'confirm') {
          setNotice('Compte créé ! Confirmez votre e-mail puis connectez-vous.')
          setMode('login')
        } else {
          setNotice('Compte créé ! Connectez-vous.')
          setMode('login')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-bark">Admin</h1>
        <p className="mt-4 rounded-2xl bg-sand p-6 text-sm leading-relaxed text-bark-soft">
          Supabase n’est pas encore configuré. Renseignez <code>VITE_SUPABASE_URL</code> et{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> dans le fichier <code>.env</code>, puis exécutez{' '}
          <code>supabase/schema.sql</code> dans votre projet Supabase.
        </p>
      </div>
    )
  }

  if (isAdmin === null) {
    return <div className="py-24 text-center text-bark-soft">Chargement…</div>
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <div className="rounded-[2rem] bg-white p-8 shadow-card">
          <h1 className="font-display text-2xl font-semibold text-bark">Administration</h1>
          <p className="mt-1 text-sm text-bark-soft">
            {mode === 'login' ? 'Connectez-vous avec le compte propriétaire.' : 'Créez le compte propriétaire.'}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nom complet"
                className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none"
            />
            {error && <p className="text-sm font-medium text-terra-dark">{error}</p>}
            {notice && <p className="text-sm font-medium text-leaf-dark">{notice}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn w-full rounded-full bg-terra px-6 py-3.5 text-sm font-semibold text-cream hover:bg-terra-dark disabled:opacity-60"
            >
              {loading ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : 'Créer le compte admin'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-bark-soft">
            {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError('')
                setNotice('')
              }}
              className="font-semibold text-terra-dark underline"
            >
              {mode === 'login' ? 'Créer le compte admin' : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-bark">Accès refusé</h1>
        <p className="mt-3 text-sm text-bark-soft">
          Ce compte n’a pas les droits d’administration.
        </p>
        <button
          onClick={() => adminSignOut()}
          className="btn mt-6 rounded-full border border-line px-6 py-3 text-sm font-semibold text-bark"
        >
          Se déconnecter
        </button>
      </div>
    )
  }

  const farmAlerts = farmAlertCount(farm.data)

  const renderNav = (onSelect?: () => void) => (
    <nav className="space-y-6" aria-label="Sections de l’administration">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-bark-soft">
            {section.title}
          </p>
          <div className="mt-2 space-y-1">
            {section.items.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id)
                  onSelect?.()
                }}
                className={`btn flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
                  tab === t.id ? 'bg-terra text-cream' : 'text-bark-soft hover:bg-sand hover:text-bark'
                }`}
              >
                <span>{t.label}</span>
                {'badge' in t && t.badge && farmAlerts > 0 && (
                  <span className="ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-terra px-1.5 text-[11px] font-bold text-cream">
                    {farmAlerts}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-bark">Administration</h1>
          <p className="mt-1 text-sm text-bark-soft">{session.user.email}</p>
        </div>
        <button
          onClick={() => adminSignOut()}
          className="btn rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-bark hover:border-terra-soft"
        >
          Déconnexion
        </button>
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
        {/* Navigation mobile : menu repliable */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            className="btn flex w-full items-center justify-between rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-bark shadow-card"
          >
            <span>
              {sections.flatMap((s) => s.items).find((t) => t.id === tab)?.label}
            </span>
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${navOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {navOpen && (
            <div className="mt-3 rounded-3xl bg-white p-4 shadow-card">{renderNav(() => setNavOpen(false))}</div>
          )}
        </div>

        {/* Navigation desktop : barre latérale par sections */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl bg-white p-4 shadow-card">{renderNav()}</div>
        </aside>

        <div className="mt-8 lg:mt-0">
          {tab === 'tableau' && (
            <Suspense
              fallback={
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Skeleton key={i} className="h-28 rounded-3xl" />
                    ))}
                  </div>
                  <Skeleton className="h-96 rounded-[2rem]" />
                </div>
              }
            >
              <DashboardHome
                farm={farm.data}
                farmRefetch={farm.refetch}
                onGoFarm={(sub) => {
                  setFarmSub({ sub: sub as FarmSub, nonce: Date.now() })
                  setTab('ferme')
                }}
                onNavigateTab={setTab}
              />
            </Suspense>
          )}
          {tab === 'produits' && (
            <ProductsTab
              products={data.products}
              refetch={data.refetch}
              hiddenTypes={parseHiddenTypes((data.texts as Record<string, string> | null)?.hidden_product_types)}
            />
          )}
          {tab === 'categories' && <CategoriesTab texts={data.texts} refetch={data.refetch} />}
          {tab === 'medias' && <MediaTab media={data.media} refetch={data.refetch} />}
          {tab === 'textes' && <TextsTab texts={data.texts} refetch={data.refetch} />}
          {tab === 'livraison' && (
            <DeliveryTab zones={data.zones} payments={data.payments} refetch={data.refetch} />
          )}
          {tab === 'commandes' && <OrdersTab orders={data.orders} refetch={data.refetch} />}
          {tab === 'blog' && <BlogTab posts={data.posts} refetch={data.refetch} />}
          {tab === 'ferme' && (
            <FarmTab farm={farm.data} loading={farm.loading} refetch={farm.refetch} products={data.products} requestedSub={farmSub} />
          )}
        </div>
      </div>
    </div>
  )
}
