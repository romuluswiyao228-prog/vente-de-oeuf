import { useState, type FormEvent } from 'react'
import { SITE } from '../data/site'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (email.trim()) setDone(true)
  }

  return (
    <section className="bg-terra-soft/50 py-16 sm:py-20" aria-label="Newsletter">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl font-semibold text-bark sm:text-4xl">
          Les bonnes nouvelles du poulailler
        </h2>
        <p className="mt-3 text-bark-soft">
          Nouvelles annonces, conseils d’éleveurs et bons plans — une fois par mois, jamais plus.
        </p>
        {done ? (
          <p className="mt-8 rounded-2xl bg-cream px-6 py-4 font-medium text-leaf-dark shadow-card">
            Merci ! Vous êtes inscrit·e à la newsletter de {SITE.name}.
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Adresse e-mail
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              className="btn flex-1 rounded-full border border-line bg-cream px-5 py-3 text-sm text-bark placeholder:text-bark-soft/60 focus:border-terra focus:outline-none"
            />
            <button
              type="submit"
              className="btn rounded-full bg-bark px-6 py-3 text-sm font-semibold text-cream hover:bg-terra-dark"
            >
              Je m'abonne
            </button>
          </form>
        )}
        <p className="mt-4 text-xs text-bark-soft">Désinscription en un clic.</p>
      </div>
    </section>
  )
}
