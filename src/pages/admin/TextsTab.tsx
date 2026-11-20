import { useEffect, useState, type FormEvent } from 'react'
import { saveTexts } from '../../lib/store'
import type { SiteTexts } from '../../lib/types'

const FIELDS: { key: keyof SiteTexts; label: string; textarea?: boolean; hint?: string }[] = [
  { key: 'site_name', label: 'Nom du site' },
  { key: 'tagline', label: 'Slogan' },
  { key: 'marquee', label: 'Bandeau défilant', textarea: true, hint: 'Un élément par ligne (séparés par | dans la base)' },
  { key: 'hero_eyebrow', label: 'Hero — surtitre' },
  { key: 'hero_title', label: 'Hero — titre' },
  { key: 'hero_subtitle', label: 'Hero — sous-titre', textarea: true },
  { key: 'hero_cta_primary', label: 'Hero — bouton principal' },
  { key: 'hero_cta_secondary', label: 'Hero — bouton secondaire' },
  { key: 'contact_email', label: 'E-mail de contact' },
  { key: 'contact_phone', label: 'Téléphone' },
  { key: 'contact_address', label: 'Adresse' },
  { key: 'whatsapp_number', label: 'Numéro WhatsApp', hint: 'Format international sans + ni espaces, ex : 22890000000' },
  { key: 'whatsapp_order_note', label: 'Note commande WhatsApp', textarea: true, hint: 'Phrase ajoutée aux messages de commande directe' },
  { key: 'social_facebook', label: 'Facebook (URL)' },
  { key: 'social_instagram', label: 'Instagram (URL)' },
  { key: 'social_youtube', label: 'YouTube (URL)' },
]

const inputCls =
  'w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-bark focus:border-terra focus:outline-none'

interface Props {
  texts: Partial<SiteTexts> | null
  refetch: () => void
}

export default function TextsTab({ texts, refetch }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (texts) setValues((prev) => ({ ...Object.fromEntries(Object.entries(texts).map(([k, v]) => [k, String(v ?? '')])), ...prev }))
  }, [texts])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveTexts(values)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      refetch()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[2rem] bg-white p-8 shadow-card">
      <h2 className="font-display text-xl font-semibold text-bark">Textes du site</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.textarea ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1.5 block text-sm font-medium text-bark">{f.label}</span>
            {f.textarea ? (
              <textarea
                rows={3}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                className={inputCls}
              />
            ) : (
              <input
                value={values[f.key] ?? ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                className={inputCls}
              />
            )}
            {f.hint && <span className="mt-1 block text-xs text-bark-soft">{f.hint}</span>}
          </label>
        ))}
      </div>
      <div className="mt-8 flex items-center gap-4">
        <button type="submit" disabled={saving} className="btn rounded-full bg-terra px-7 py-3 text-sm font-semibold text-cream hover:bg-terra-dark disabled:opacity-60">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && <span className="text-sm font-medium text-leaf-dark">Enregistré ✓</span>}
      </div>
    </form>
  )
}
