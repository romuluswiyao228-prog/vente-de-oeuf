import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { useCart } from '../lib/cart'
import { saveLastOrder } from '../lib/lastOrder'
import { createOrder, formatPrice, useDeliveryZones, usePaymentMethods, useProducts, useSiteTexts } from '../lib/store'
import { useSeo } from '../lib/seo'
import type { OrderFulfillment, PaymentMethod } from '../lib/types'

const inputCls =
  'w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm text-bark placeholder:text-bark-soft/60 focus:border-terra focus:outline-none'

export default function Commande() {
  useSeo('Commande')
  const navigate = useNavigate()
  const texts = useSiteTexts()
  const { lines, clear } = useCart()
  const products = useProducts()
  const zones = useDeliveryZones()
  const payments = usePaymentMethods()
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const items = lines
    .map((l) => ({ product_id: l.product_id, quantity: l.quantity, product: byId.get(l.product_id) }))
    .filter((i) => i.product && i.product.stock >= i.quantity)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fulfillment, setFulfillment] = useState<OrderFulfillment>('livraison')
  const [zoneId, setZoneId] = useState('')
  const [address, setAddress] = useState('')
  const [paymentId, setPaymentId] = useState(payments[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Les moyens de paiement arrivent en async : présélectionner le premier
  useEffect(() => {
    if (!paymentId && payments.length > 0) setPaymentId(payments[0].id)
  }, [payments, paymentId])

  const selectedZone = zones.find((z) => z.id === zoneId)
  const selectedPayment: PaymentMethod | undefined = payments.find((p) => p.id === paymentId) ?? payments[0]

  const subtotal = items.reduce((n, i) => n + (i.product?.price_fcfa ?? 0) * i.quantity, 0)
  const deliveryFee = fulfillment === 'livraison' ? (selectedZone?.fee_fcfa ?? 0) : 0
  const total = subtotal + deliveryFee

  if (lines.length === 0) {
    return <Navigate to="/panier" replace />
  }
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-bark">Articles indisponibles</h1>
        <p className="mt-3 text-bark-soft">
          Les articles de votre panier ne sont plus disponibles. Retournez au catalogue.
        </p>
        <Link
          to="/annonces"
          className="btn mt-8 inline-block rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream"
        >
          Voir le catalogue
        </Link>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (honeypot) return // bot : on ignore silencieusement
    setError('')

    if (fulfillment === 'livraison' && !zoneId) {
      setError('Veuillez choisir une zone de livraison.')
      return
    }
    if (fulfillment === 'livraison' && !address.trim()) {
      setError("Veuillez indiquer votre adresse ou quartier de livraison.")
      return
    }

    setLoading(true)
    try {
      const created = await createOrder({
        customer_name: name,
        phone,
        email,
        fulfillment,
        zone_id: fulfillment === 'livraison' ? zoneId : null,
        address: fulfillment === 'livraison' ? address : '',
        payment_method: selectedPayment?.id ?? '',
        note,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      })

      saveLastOrder({
        id: created.id,
        reference: created.reference,
        created_at: new Date().toISOString(),
        customer_name: name,
        phone,
        email,
        fulfillment,
        zone: created.zone,
        address: fulfillment === 'livraison' ? address : '',
        items: created.items,
        subtotal_fcfa: created.subtotal_fcfa,
        delivery_fee_fcfa: created.delivery_fee_fcfa,
        total_fcfa: created.total_fcfa,
        payment_method: selectedPayment?.id ?? '',
        payment_label: selectedPayment?.label ?? '',
        payment_details: selectedPayment?.details ?? '',
        note,
      })
      clear()
      navigate('/commande/confirmation')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.'
      setError(
        msg.toLowerCase().includes('stock')
          ? `Stock insuffisant : ${msg}`
          : `La commande n'a pas pu être enregistrée : ${msg}. Réessayez ou contactez-nous sur WhatsApp.`,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Commande"
        title="Finaliser la commande"
        subtitle="Quelques informations et c'est parti."
      />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px]">
        <Reveal>
          <form onSubmit={submit} className="space-y-6">
            {/* Honeypot anti-spam : invisible pour les humains */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="hp-website">Site web</label>
              <input
                id="hp-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="grid gap-5 rounded-[2rem] bg-white p-7 shadow-card sm:grid-cols-2">
              <h2 className="font-display text-xl font-semibold text-bark sm:col-span-2">Vos coordonnées</h2>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-bark">
                  Nom complet <span className="text-terra-dark">*</span>
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-bark">
                  Téléphone <span className="text-terra-dark">*</span>
                </span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                  autoComplete="tel"
                  placeholder="Ex : 90 00 00 00"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-bark">E-mail (facultatif)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  autoComplete="email"
                />
              </label>
            </div>

            <div className="rounded-[2rem] bg-white p-7 shadow-card">
              <h2 className="font-display text-xl font-semibold text-bark">Mode de réception</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { value: 'livraison', label: 'Livraison', desc: 'À domicile ou en agence, dans votre zone' },
                    { value: 'retrait', label: 'Retrait sur place', desc: 'Vous venez chercher votre commande' },
                  ] as const
                ).map((m) => (
                  <label
                    key={m.value}
                    className={`btn flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                      fulfillment === m.value
                        ? 'border-terra bg-terra-soft/40'
                        : 'border-line bg-cream hover:border-terra-soft'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      value={m.value}
                      checked={fulfillment === m.value}
                      onChange={() => setFulfillment(m.value)}
                      className="mt-1 accent-terra"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-bark">{m.label}</span>
                      <span className="mt-0.5 block text-xs text-bark-soft">{m.desc}</span>
                    </span>
                  </label>
                ))}
              </div>

              {fulfillment === 'livraison' && (
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-bark">
                      Zone de livraison <span className="text-terra-dark">*</span>
                    </span>
                    <select
                      required
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Choisir une zone…</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} — {z.fee_fcfa === 0 ? 'livraison gratuite' : formatPrice(z.fee_fcfa)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-bark">
                      Adresse ou quartier <span className="text-terra-dark">*</span>
                    </span>
                    <input
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={inputCls}
                      placeholder="Ex : Agoè, rue des palmiers"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] bg-white p-7 shadow-card">
              <h2 className="font-display text-xl font-semibold text-bark">Mode de paiement</h2>
              <div className="mt-4 space-y-3">
                {payments.map((p) => (
                  <label
                    key={p.id}
                    className={`btn flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                      paymentId === p.id
                        ? 'border-terra bg-terra-soft/40'
                        : 'border-line bg-cream hover:border-terra-soft'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentId === p.id}
                      onChange={() => setPaymentId(p.id)}
                      className="mt-1 accent-terra"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-bark">{p.label}</span>
                      {p.details && <span className="mt-0.5 block text-xs text-bark-soft">{p.details}</span>}
                    </span>
                  </label>
                ))}
              </div>
              <label className="mt-5 block">
                <span className="mb-1.5 block text-sm font-medium text-bark">Note (facultatif)</span>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={inputCls}
                  placeholder="Précisions sur votre commande…"
                />
              </label>
            </div>

            {error && (
              <p className="rounded-2xl border border-terra/30 bg-terra-soft/40 px-5 py-4 text-sm font-medium text-terra-dark">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn w-full rounded-full bg-terra px-6 py-4 text-sm font-semibold text-cream shadow-card hover:bg-terra-dark disabled:opacity-60"
            >
              {loading ? 'Enregistrement…' : `Confirmer la commande — ${formatPrice(total)}`}
            </button>
          </form>
        </Reveal>

        <Reveal delay={150}>
          <div className="rounded-[2rem] bg-white p-7 shadow-card lg:sticky lg:top-28">
            <h2 className="font-display text-xl font-semibold text-bark">Récapitulatif</h2>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li key={i.product_id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-bark-soft">
                    {i.product?.name} <span className="text-bark-soft/70">× {i.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium text-bark">
                    {formatPrice((i.product?.price_fcfa ?? 0) * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-bark-soft">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-bark-soft">
                <span>Livraison</span>
                <span>
                  {fulfillment === 'retrait'
                    ? 'Retrait gratuit'
                    : selectedZone
                      ? selectedZone.fee_fcfa === 0
                        ? 'Gratuite'
                        : formatPrice(selectedZone.fee_fcfa)
                      : '—'}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold text-terra-dark">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-bark-soft">
              Le montant final est confirmé par {texts.site_name} avant la préparation de la
              commande. Paiement par {selectedPayment?.label ?? 'Mobile Money ou à la livraison'}.
            </p>
          </div>
        </Reveal>
      </section>
    </>
  )
}
