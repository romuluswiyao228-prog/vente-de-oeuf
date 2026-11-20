import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { readLastOrder } from '../lib/lastOrder'
import { formatPrice, useSiteTexts, whatsappLink } from '../lib/store'
import { useSeo } from '../lib/seo'

export default function Confirmation() {
  useSeo('Commande enregistrée')
  const texts = useSiteTexts()
  const order = useMemo(() => readLastOrder(), [])

  if (!order) {
    return <Navigate to="/" replace />
  }

  const waMessage = [
    `Bonjour ${texts.site_name} 👋`,
    ``,
    `Je viens de passer la commande ${order.reference} :`,
    `• Nom : ${order.customer_name}`,
    `• Téléphone : ${order.phone}`,
    order.email ? `• E-mail : ${order.email}` : null,
    `• Mode : ${order.fulfillment === 'livraison' ? 'Livraison' : 'Retrait sur place'}`,
    order.fulfillment === 'livraison'
      ? `• Zone : ${order.zone}${order.address ? ` — ${order.address}` : ''}`
      : null,
    ``,
    `Articles :`,
    ...order.items.map(
      (i) => `• ${i.quantity} × ${i.name} — ${formatPrice(i.price_fcfa * i.quantity)}`,
    ),
    ``,
    `Sous-total : ${formatPrice(order.subtotal_fcfa)}`,
    order.fulfillment === 'livraison'
      ? `Frais de livraison : ${order.delivery_fee_fcfa === 0 ? 'gratuits' : formatPrice(order.delivery_fee_fcfa)}`
      : null,
    `Total : ${formatPrice(order.total_fcfa)}`,
    `Paiement : ${order.payment_label}${order.payment_details ? ` — ${order.payment_details}` : ''}`,
    order.note ? `Note : ${order.note}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join('\n')

  const waHref = texts.whatsapp_number ? whatsappLink(texts.whatsapp_number, waMessage) : null

  return (
    <>
      <PageHeader
        eyebrow="Commande"
        title="Commande enregistrée"
        subtitle={`Merci ${order.customer_name} ! Votre référence : ${order.reference}`}
      />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Reveal className="rounded-[2rem] bg-white p-8 shadow-card sm:p-10">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-leaf-soft text-leaf-dark">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.2 14.5L6 12l1.4-1.4 3.4 3.4 6-6L18 9.4l-7.2 7.1z" />
              </svg>
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-bark">Référence {order.reference}</h2>
              <p className="text-sm text-bark-soft">
                {order.fulfillment === 'livraison' ? `Livraison — ${order.zone}` : 'Retrait sur place'} ·{' '}
                {new Date(order.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <ul className="mt-8 space-y-3 border-t border-line pt-6">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-bark-soft">
                  {i.name} <span className="text-bark-soft/70">× {i.quantity}</span>
                </span>
                <span className="shrink-0 font-medium text-bark">{formatPrice(i.price_fcfa * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-bark-soft">
              <span>Sous-total</span>
              <span>{formatPrice(order.subtotal_fcfa)}</span>
            </div>
            {order.fulfillment === 'livraison' && (
              <div className="flex justify-between text-bark-soft">
                <span>Frais de livraison</span>
                <span>{order.delivery_fee_fcfa === 0 ? 'Gratuits' : formatPrice(order.delivery_fee_fcfa)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-lg font-bold text-terra-dark">
              <span>Total</span>
              <span>{formatPrice(order.total_fcfa)}</span>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-sand/70 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-bark-soft">
              Instructions de paiement
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-bark">
              <strong>{order.payment_label}</strong>
              {order.payment_details ? ` — ${order.payment_details}` : ''}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-bark-soft">
              {texts.site_name} vous contactera pour confirmer votre commande et vous indiquer la
              marche à suivre pour le paiement.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="btn inline-flex items-center gap-2.5 rounded-full bg-terra px-7 py-4 text-sm font-semibold text-cream shadow-card hover:bg-terra-dark"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.7 3 .6.9-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
                </svg>
                Envoyer ma commande sur WhatsApp
              </a>
            )}
            <Link
              to="/annonces"
              className="btn inline-flex items-center gap-2 rounded-full border border-line bg-cream px-7 py-4 text-sm font-semibold text-bark hover:border-terra-soft"
            >
              Continuer mes achats
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  )
}
