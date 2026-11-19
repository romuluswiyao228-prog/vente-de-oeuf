import { useState, type FormEvent } from 'react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { SITE } from '../data/site'

export default function Contact() {
  const [sent, setSent] = useState(false)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Contact"
        subtitle={`Une question sur une annonce, une livraison ou votre compte ? L’équipe ${SITE.name} vous répond sous 24 h.`}
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <div className="space-y-5">
            {[
              { t: 'E-mail', d: SITE.email },
              { t: 'Horaires', d: 'Lun – Ven, 9 h – 18 h' },
              { t: 'Adresse', d: '12 chemin des Coquelicots, 21000 Dijon' },
            ].map((c) => (
              <div key={c.t} className="rounded-3xl bg-white p-6 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-bark-soft">{c.t}</h2>
                <p className="mt-1.5 font-medium text-bark">{c.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="rounded-[2rem] bg-white p-8 shadow-card sm:p-10">
            {sent ? (
              <p className="rounded-2xl bg-leaf-soft px-5 py-4 font-medium text-leaf-dark">
                Message envoyé ! Nous revenons vers vous très vite.
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-bark">Nom</span>
                    <input required className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-bark">E-mail</span>
                    <input type="email" required className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-bark">Sujet</span>
                  <input required className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-bark">Message</span>
                  <textarea required rows={5} className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none" />
                </label>
                <button type="submit" className="btn w-full rounded-full bg-terra px-6 py-4 text-sm font-semibold text-cream hover:bg-terra-dark">
                  Envoyer le message
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </section>
    </>
  )
}
