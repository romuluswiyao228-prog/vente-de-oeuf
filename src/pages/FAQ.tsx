import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { useSiteTexts } from '../lib/store'
import { useSeo } from '../lib/seo'

const faqs = [
  {
    q: 'Comment passer commande ?',
    a: 'Sur chaque fiche produit, cliquez sur « Commander sur WhatsApp ». Votre message s’ouvre avec le produit, la quantité et le prix déjà remplis — il ne reste qu’à envoyer.',
  },
  {
    q: 'Quels sont les moyens de paiement ?',
    a: 'Mobile Money (T-Money, Flooz) ou paiement à la livraison, en espèces. Vous choisissez au moment de la commande.',
  },
  {
    q: 'Livrez-vous partout au Togo ?',
    a: 'Oui : livraison à Lomé et dans les principales villes du Togo. Des frais de livraison peuvent s’appliquer selon la zone — ils sont indiqués sur chaque fiche produit. Le retrait sur place est aussi possible.',
  },
  {
    q: 'Les œufs sont-ils fertiles ?',
    a: 'Oui, pour la catégorie « Œufs fécondés », chaque lot est fertilisé et la date de ponte est indiquée. Un taux d’éclosion n’est toutefois jamais garanti à 100 % — c’est le propre de l’incubation.',
  },
  {
    q: 'Comment conserver les œufs fertiles avant l’incubation ?',
    a: 'Conservez-les pointus vers le bas, dans un endroit frais et stable, idéalement entre 12 et 18 °C. Évitez les secousses et ne les lavez pas.',
  },
  {
    q: 'Quelle race choisir pour démarrer ?',
    a: 'Les races disponibles sont listées sur le catalogue, avec le nombre d’œufs en stock pour chacune. Marans et Issa Brown sont des valeurs sûres pour débuter.',
  },
]

export default function FAQ() {
  useSeo('FAQ')
  const texts = useSiteTexts()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <>
      <PageHeader
        eyebrow="Questions fréquentes"
        title="FAQ"
        subtitle={`Tout ce qu’il faut savoir avant de commander sur ${texts.site_name}.`}
      />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <div className="overflow-hidden rounded-3xl bg-white shadow-card">
                <button
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  <span className="font-display text-lg font-semibold text-bark">{f.q}</span>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-terra-soft text-terra-dark transition-transform duration-300 ${
                      open === i ? 'rotate-45' : ''
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
                {open === i && (
                  <p className="px-6 pb-6 text-sm leading-relaxed text-bark-soft">{f.a}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}
