import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { SITE } from '../data/site'

const pages: Record<string, { title: string; body: string[] }> = {
  'conditions-vente': {
    title: 'Conditions de vente',
    body: [
      'Les présentes conditions régissent les ventes conclues sur ' + SITE.name + ' entre un acheteur et un éleveur vérifié.',
      'Le paiement est encaissé par la plateforme et reversé à l’éleveur uniquement après confirmation de réception du colis par l’acheteur.',
      'En cas de non-conformité (œufs non fécondés, mortalité constatée à la livraison), une réclamation peut être ouverte sous 48 h avec photos à l’appui.',
    ],
  },
  'conditions-utilisation': {
    title: 'Conditions d’utilisation',
    body: [
      'En utilisant ' + SITE.name + ', vous acceptez de fournir des informations exactes et de respecter les animaux et les personnes.',
      'Sont interdites : les annonces mensongères, la vente d’animaux malades ou protégés, et toute forme de fraude.',
      'La plateforme se réserve le droit de suspendre tout compte ne respectant pas ces règles.',
    ],
  },
  'reglementation-vendeur': {
    title: 'Réglementation vendeur',
    body: [
      'Tout éleveur doit respecter la réglementation en vigueur : enregistrement, normes sanitaires et bien-être animal.',
      'La vente d’animaux vivants est soumise à des règles spécifiques (certificat, transport, âge minimal).',
      'Les œufs destinés à l’incubation doivent provenir de reproducteurs sains et être vendus avec la date de ponte.',
    ],
  },
  'charte-avis': {
    title: 'Charte des avis',
    body: [
      'Les avis sont publiés uniquement par des acheteurs ayant reçu leur commande.',
      'Chaque avis est modéré : insultes, spam et contenu non lié à la commande sont supprimés.',
      'Les éleveurs peuvent répondre publiquement à chaque avis.',
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
  const page = pages[slug]

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
            Dernière mise à jour : novembre 2025 — {SITE.name}
          </p>
        </Reveal>
      </section>
    </>
  )
}
