import { useState, type FormEvent } from 'react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { useDeliveryZones, usePaymentMethods, useSiteTexts, whatsappLink } from '../lib/store'
import { useSeo } from '../lib/seo'

export default function Contact() {
  useSeo('Contact')
  const texts = useSiteTexts()
  const zones = useDeliveryZones()
  const payments = usePaymentMethods()
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
        subtitle={`Une question sur une commande, une livraison ou un produit ? L’équipe ${texts.site_name} vous répond vite.`}
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <div className="space-y-5">
            {[
              { t: 'E-mail', d: texts.contact_email },
              { t: 'Téléphone / WhatsApp', d: texts.contact_phone },
              { t: 'Adresse', d: texts.contact_address },
            ]
              .filter((c) => c.d)
              .map((c) => (
                <div key={c.t} className="rounded-3xl bg-white p-6 shadow-card">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-bark-soft">{c.t}</h2>
                  <p className="mt-1.5 font-medium text-bark">{c.d}</p>
                </div>
              ))}
            {texts.whatsapp_number && (
              <a
                href={whatsappLink(texts.whatsapp_number, `Bonjour ${texts.site_name}, j'ai une question.`)}
                target="_blank"
                rel="noreferrer"
                className="btn flex items-center justify-between rounded-3xl bg-terra p-6 text-cream shadow-card hover:bg-terra-dark"
              >
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-cream/70">WhatsApp</h2>
                  <p className="mt-1.5 font-medium">Écrivez-nous directement</p>
                </div>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.7 3 .6.9-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
                </svg>
              </a>
            )}
            {(zones.length > 0 || payments.length > 0) && (
              <div className="rounded-3xl bg-white p-6 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-bark-soft">Livraison & paiement</h2>
                {zones.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-bark-soft">
                    {zones.map((z) => (
                      <li key={z.id} className="flex justify-between gap-3">
                        <span>{z.name}</span>
                        <span className="font-medium text-bark">
                          {z.fee_fcfa === 0 ? 'Gratuite' : `${z.fee_fcfa.toLocaleString('fr-FR')} FCFA`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {payments.length > 0 && (
                  <p className="mt-3 text-sm text-bark-soft">
                    {payments.map((p) => p.label).join(' · ')}
                  </p>
                )}
              </div>
            )}
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
                    <span className="mb-1.5 block text-sm font-medium text-bark">Téléphone</span>
                    <input type="tel" className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-bark">E-mail</span>
                  <input type="email" className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-terra focus:outline-none" />
                </label>
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
