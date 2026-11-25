import { useState } from 'react'
import { parseHiddenTypes, saveHiddenTypes } from '../../lib/store'
import type { ProductType, SiteTexts } from '../../lib/types'
import { PRODUCT_TYPES } from '../../lib/types'

interface Props {
  texts: Partial<SiteTexts> | null
  refetch: () => void
}

/**
 * Visibilité des types de produits sur le site public.
 * Un type masqué n'apparaît nulle part côté public ; ses produits
 * restent en base et dans l'admin. Réversible à tout moment.
 */
export default function CategoriesTab({ texts, refetch }: Props) {
  const savedRaw = (texts as Record<string, string> | null)?.hidden_product_types
  const savedHidden = parseHiddenTypes(savedRaw)
  const [draft, setDraft] = useState<ProductType[] | null>(null)
  const [saving, setSaving] = useState(false)

  const hidden = draft ?? savedHidden
  const dirty = draft !== null

  const toggle = (type: ProductType) => {
    setDraft(
      hidden.includes(type) ? hidden.filter((t) => t !== type) : [...hidden, type],
    )
  }

  const submit = async () => {
    setSaving(true)
    try {
      await saveHiddenTypes(hidden)
      setDraft(null)
      refetch()
    } catch (err) {
      console.error(err)
      alert('Erreur lors de l’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-card">
      <h2 className="font-display text-xl font-semibold text-bark">Catégories de produits</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bark-soft">
        Choisissez les types visibles sur le site public. Un type masqué disparaît du menu,
        du catalogue, de l’accueil et des fiches produits — ses produits restent conservés
        en base et accessibles ici dans l’admin.
      </p>

      <ul className="mt-6 divide-y divide-line">
        {PRODUCT_TYPES.map((t) => {
          const isHidden = hidden.includes(t.value)
          return (
            <li key={t.value} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-semibold text-bark">{t.label}</p>
                <p className="mt-0.5 text-sm text-bark-soft">{t.tagline}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isHidden ? 'bg-sand text-bark-soft' : 'bg-leaf-soft text-leaf-dark'
                  }`}
                >
                  {isHidden ? 'Masqué' : 'Visible'}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(t.value)}
                  className="btn rounded-full border border-line bg-cream px-4 py-2 text-sm font-semibold text-bark hover:border-terra-soft"
                >
                  {isHidden ? 'Afficher' : 'Masquer'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !dirty}
          className="btn rounded-full bg-terra px-7 py-3 text-sm font-semibold text-cream hover:bg-terra-dark disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer la visibilité'}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="btn rounded-full border border-line px-6 py-3 text-sm font-semibold text-bark"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  )
}
