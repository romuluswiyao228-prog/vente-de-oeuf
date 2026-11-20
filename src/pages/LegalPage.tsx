import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { useSiteTexts } from '../lib/store'
import { useSeo } from '../lib/seo'

const pages: Record<string, { title: string; body: string[] }> = {
  'conditions-vente': {
    title: 'Conditions de vente',
    body: [
      'Les présentes conditions régissent les ventes conclues sur le site. Les commandes se font via WhatsApp et sont confirmées manuellement.',
      'Le paiement s’effectue par Mobile Money (T-Money, Flooz) ou en espèces à la livraison, selon l’option choisie.',
      'En cas de produit non conforme, contactez-nous sous 24 h avec des photos. Un échange ou un remboursement peut être proposé.',
    ],
  },
  'conditions-utilisation': {
    title: "Conditions d'utilisation",
    body: [
      'En utilisant le site, vous acceptez de fournir des informations exactes lors de vos commandes.',
      'Sont interdites : les commandes frauduleuses, le détournement du service et toute tentative de nuire au site.',
      'Nous nous réservons le droit de refuser ou d’annuler toute commande suspecte.',
    ],
  },
  'reglementation-vendeur': {
    title: 'Réglementation vendeur',
    body: [
      'La vente d’animaux vivants et d’œufs est soumise à la réglementation en vigueur au Togo.',
      'Les produits sont vendus avec la mention « vendus pour la consommation / l’élevage », selon le cas.',
      'Pour toute question réglementaire, contactez-nous directement.',
    ],
  },
  cookies: {
    title: 'Cookies',
    body: [
      'Nous utilisons des cookies techniques nécessaires au fonctionnement du site et, avec votre accord, des cookies de mesure d’audience.',
      'Vous pouvez gérer vos préférences à tout moment depuis votre navigateur ou notre bandeau de consentement.',
      'Aucun cookie publicitaire tiers n’est déposé sans votre accord.',
    ],
  },
}

export default function LegalPage({ slug }: { slug: string }) {
  const texts = useSiteTexts()
  const page = pages[slug]
  useSeo(page?.title)

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-bark">Page introuvable</h1>
      </div>
    )
  }

  return (
    <>
      <PageHeader eyebrow="Informations légales" title={page.title} />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Reveal className="rounded-[2rem] bg-white p-8 shadow-card sm:p-10">
          {page.body.map((p) => (
            <p key={p.slice(0, 30)} className="mb-4 leading-relaxed text-bark-soft last:mb-0">
              {p}
            </p>
          ))}
          <p className="mt-8 border-t border-line pt-6 text-xs text-bark-soft">
            Dernière mise à jour : novembre 2026 — {texts.site_name}
          </p>
        </Reveal>
      </section>
    </>
  )
}
