import { useState, type FormEvent } from 'react'
import { adminSignIn, adminSignOut, adminSignUp, useAdminSession } from '../../lib/store'
import ProductsTab from './ProductsTab'
import MediaTab from './MediaTab'
import TextsTab from './TextsTab'
import DeliveryTab from './DeliveryTab'
import OrdersTab from './OrdersTab'
import BlogTab from './BlogTab'
import { useAdminData } from '../../lib/store'

const tabs = [
  { id: 'produits', label: 'Produits' },
  { id: 'medias', label: 'Médias' },
  { id: 'textes', label: 'Textes' },
  { id: 'livraison', label: 'Livraison & Paiement' },
  { id: 'commandes', label: 'Commandes' },
  { id: 'blog', label: 'Blog' },
]

export default function Admin() {
  const { session, isAdmin, configured } = useAdminSession()
  const data = useAdminData()
  const [tab, setTab] = useState('produits')
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

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`btn shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold ${
              tab === t.id ? 'bg-terra text-cream' : 'bg-white text-bark shadow-card hover:text-terra-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === 'produits' && <ProductsTab products={data.products} refetch={data.refetch} />}
        {tab === 'medias' && <MediaTab media={data.media} refetch={data.refetch} />}
        {tab === 'textes' && <TextsTab texts={data.texts} refetch={data.refetch} />}
        {tab === 'livraison' && (
          <DeliveryTab zones={data.zones} payments={data.payments} refetch={data.refetch} />
        )}
        {tab === 'commandes' && <OrdersTab orders={data.orders} refetch={data.refetch} />}
        {tab === 'blog' && <BlogTab posts={data.posts} refetch={data.refetch} />}
      </div>
    </div>
  )
}
