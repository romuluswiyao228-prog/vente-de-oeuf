import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import { useProducts, useSiteTexts, whatsappLink } from '../lib/store'
import { useSeo } from '../lib/seo'
import { PRODUCT_TYPES, type ProductType } from '../lib/types'

const selectCls =
  'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-bark focus:border-terra focus:outline-none'

export default function Annonces() {
  useSeo('Catalogue')
  const [params, setParams] = useSearchParams()
  const typeParam = params.get('type') as ProductType | null
  const products = useProducts()
  const texts = useSiteTexts()

  const [type, setType] = useState<ProductType | 'tous'>(
    PRODUCT_TYPES.some((t) => t.value === typeParam) ? (typeParam as ProductType) : 'tous',
  )
  const [maxPrice, setMaxPrice] = useState(100000)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (type !== 'tous' && p.type !== type) return false
        if (p.price_fcfa > maxPrice) return false
        if (inStockOnly && p.stock <= 0) return false
        if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false
        return true
      }),
    [products, type, maxPrice, inStockOnly, query],
  )

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Tous nos produits"
        subtitle="Œufs fécondés, volailles, poussins et matériel — filtrez par type, prix et disponibilité."
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Reveal className="rounded-3xl bg-white p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-bark-soft">Recherche</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Marans, couveuse…"
                className={selectCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-bark-soft">Type</span>
              <select
                value={type}
                onChange={(e) => {
                  const v = e.target.value as ProductType | 'tous'
                  setType(v)
                  if (v === 'tous') setParams({})
                  else setParams({ type: v })
                }}
                className={selectCls}
              >
                <option value="tous">Tous</option>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-bark-soft">
                Prix max : {maxPrice >= 100000 ? 'sans limite' : `${maxPrice.toLocaleString('fr-FR')} FCFA`}
              </span>
              <input
                type="range"
                min={1000}
                max={100000}
                step={1000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-3 w-full accent-terra"
              />
            </label>
            <label className="flex items-end pb-2">
              <button
                type="button"
                onClick={() => setInStockOnly((v) => !v)}
                className={`btn w-full rounded-xl border px-4 py-2.5 text-sm font-medium ${
                  inStockOnly
                    ? 'border-terra bg-terra text-cream'
                    : 'border-line bg-cream text-bark hover:border-terra-soft'
                }`}
              >
                {inStockOnly ? '✓ En stock uniquement' : 'En stock uniquement'}
              </button>
            </label>
          </div>
          <p className="mt-5 border-t border-line pt-5 text-sm text-bark-soft">
            <strong className="text-bark">{filtered.length}</strong> produit{filtered.length > 1 ? 's' : ''}
          </p>
        </Reveal>

        {products.length === 0 ? (
          <Reveal className="rounded-[2rem] bg-white p-10 text-center shadow-card">
            <p className="font-display text-2xl font-semibold text-bark">Le catalogue arrive bientôt.</p>
            <p className="mt-2 text-bark-soft">
              Écrivez-nous sur WhatsApp pour découvrir nos produits et passer commande.
            </p>
            {texts.whatsapp_number && (
              <a
                href={whatsappLink(texts.whatsapp_number, `Bonjour ${texts.site_name}, je souhaite en savoir plus sur vos produits.`)}
                target="_blank"
                rel="noreferrer"
                className="btn mt-6 inline-block rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream hover:bg-terra-dark"
              >
                Écrire sur WhatsApp
              </a>
            )}
          </Reveal>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 && (
              <p className="col-span-full rounded-3xl bg-white p-10 text-center text-bark-soft shadow-card">
                Aucun produit ne correspond à vos filtres.
              </p>
            )}
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} delay={(i % 3) * 90} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
