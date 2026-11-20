import { useRef, useState } from 'react'
import {
  addMedia,
  deleteMedia,
  reorderMedia,
  setMediaActive,
  testMediaAccess,
  uploadFile,
  type MediaTestResult,
} from '../../lib/store'
import type { MediaItem, MediaKind } from '../../lib/types'

const MAX_SIZE = 50 * 1024 * 1024 // 50 Mo

interface KindDef {
  kind: MediaKind
  label: string
  multiple: boolean
  isVideo: boolean
  accept: string
}

const KINDS: KindDef[] = [
  { kind: 'hero_video', label: 'Vidéo du hero', multiple: false, isVideo: true, accept: 'video/mp4,video/webm,.mp4,.webm' },
  { kind: 'story_video', label: 'Vidéo section histoire', multiple: false, isVideo: true, accept: 'video/mp4,video/webm,.mp4,.webm' },
  { kind: 'strip_photo', label: 'Photos bandeau défilant', multiple: true, isVideo: false, accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp' },
  { kind: 'cta_image', label: 'Image bandeau CTA', multiple: false, isVideo: false, accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp' },
  { kind: 'logo', label: 'Logo', multiple: false, isVideo: false, accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp' },
]

interface KindMessage {
  type: 'ok' | 'err'
  text: string
  detail?: string
}

function validateFile(file: File, isVideo: boolean): string | null {
  if (file.size > MAX_SIZE) return 'Fichier trop lourd (50 Mo maximum).'
  const name = file.name.toLowerCase()
  if (isVideo) {
    const ok =
      file.type === 'video/mp4' ||
      file.type === 'video/webm' ||
      name.endsWith('.mp4') ||
      name.endsWith('.webm')
    if (!ok) return 'Convertis ta vidéo en MP4 (H.264) ou en WebM.'
  } else {
    const ok =
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      /\.(jpe?g|png|webp)$/.test(name)
    if (!ok) return "Format d'image non supporté : utilise JPG, PNG ou WebP."
  }
  return null
}

/** Traduit une erreur technique en cause lisible. */
function friendlyError(raw: string): { text: string; detail: string } {
  const lower = raw.toLowerCase()
  if (lower.includes('bucket') || lower.includes('not found')) {
    return { text: 'Bucket introuvable', detail: raw }
  }
  if (lower.includes('row-level') || lower.includes('policy') || lower.includes('permission') || lower.includes('403') || lower.includes('unauthorized')) {
    return { text: 'Envoi refusé : droits insuffisants', detail: raw }
  }
  if (lower.includes('payload') || lower.includes('too large') || lower.includes('413') || lower.includes('entity')) {
    return { text: 'Fichier trop lourd', detail: raw }
  }
  if (lower.includes('non configur')) {
    return { text: 'Supabase non configuré', detail: raw }
  }
  return { text: raw, detail: raw }
}

interface Props {
  media: MediaItem[]
  refetch: () => void
}

export default function MediaTab({ media, refetch }: Props) {
  const [uploading, setUploading] = useState<MediaKind | null>(null)
  const [messages, setMessages] = useState<Record<string, KindMessage>>({})
  const [tests, setTests] = useState<MediaTestResult[] | null>(null)
  const [testing, setTesting] = useState(false)
  const refs = useRef<Record<string, HTMLInputElement | null>>({})

  const setMsg = (kind: MediaKind, msg: KindMessage | null) =>
    setMessages((prev) => {
      const next = { ...prev }
      if (msg) next[kind] = msg
      else delete next[kind]
      return next
    })

  const handleUpload = async (def: KindDef, files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)

    // Validation format + taille avant tout envoi
    for (const f of list) {
      const err = validateFile(f, def.isVideo)
      if (err) {
        setMsg(def.kind, { type: 'err', text: err })
        return
      }
    }

    setUploading(def.kind)
    setMsg(def.kind, null)
    try {
      for (const file of list) {
        // 1. Envoi du fichier
        const url = await uploadFile(file, def.kind)
        // 2. Enregistrement en base
        const created = await addMedia(def.kind, url)
        // 3. Seulement ensuite : suppression des anciens (single = tous les autres)
        if (!def.multiple) {
          const olds = media.filter((x) => x.kind === def.kind && x.id !== created.id)
          for (const m of olds) {
            try {
              await deleteMedia(m.id, m.url)
            } catch (e) {
              console.warn('Ancien média non supprimé :', e)
            }
          }
          break
        }
      }
      setMsg(def.kind, {
        type: 'ok',
        text: def.isVideo
          ? 'Vidéo enregistrée. Elle est visible sur le site.'
          : def.multiple
            ? 'Photos ajoutées. Elles sont visibles sur le site.'
            : 'Image enregistrée. Elle est visible sur le site.',
      })
      refetch()
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      const { text, detail } = friendlyError(raw)
      setMsg(def.kind, { type: 'err', text, detail: detail !== text ? detail : undefined })
    } finally {
      setUploading(null)
    }
  }

  const runTests = async () => {
    setTesting(true)
    setTests(null)
    try {
      setTests(await testMediaAccess())
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Barre d'outils : test de la chaîne médias */}
      <div className="rounded-[2rem] bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-bark">Diagnostic</h2>
            <p className="mt-1 text-sm text-bark-soft">
              Vérifie le bucket Storage, les droits admin et la lecture publique.
            </p>
          </div>
          <button
            type="button"
            onClick={runTests}
            disabled={testing}
            className="btn rounded-full border border-line bg-cream px-5 py-2.5 text-sm font-semibold text-bark hover:border-terra disabled:opacity-60"
          >
            {testing ? 'Test en cours…' : 'Tester les médias'}
          </button>
        </div>
        {tests && (
          <ul className="mt-4 space-y-2">
            {tests.map((t) => (
              <li key={t.label} className="flex items-start gap-2.5 text-sm">
                <span className={t.ok ? 'font-bold text-leaf-dark' : 'font-bold text-terra-dark'}>
                  {t.ok ? '✓' : '✗'}
                </span>
                <span>
                  <span className="font-medium text-bark">{t.label}</span>
                  <span className="text-bark-soft"> — {t.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {KINDS.map((def) => {
        const items = media.filter((m) => m.kind === def.kind)
        const activeCount = items.filter((m) => m.active).length
        const msg = messages[def.kind]
        return (
          <div key={def.kind} className="rounded-[2rem] bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-bark">{def.label}</h2>
                <p className="mt-1 text-sm">
                  <span className="text-bark-soft">Affiché sur le site : </span>
                  <span className={`font-semibold ${activeCount > 0 ? 'text-leaf-dark' : 'text-terra-dark'}`}>
                    {activeCount > 0 ? 'Oui' : 'Non'}
                  </span>
                </p>
              </div>
              <div>
                <input
                  ref={(el) => {
                    refs.current[def.kind] = el
                  }}
                  type="file"
                  accept={def.accept}
                  multiple={def.multiple}
                  className="hidden"
                  onChange={(e) => {
                    handleUpload(def, e.target.files)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => refs.current[def.kind]?.click()}
                  disabled={uploading === def.kind}
                  className="btn rounded-full bg-terra px-5 py-2.5 text-sm font-semibold text-cream hover:bg-terra-dark disabled:opacity-60"
                >
                  {uploading === def.kind
                    ? 'Envoi en cours…'
                    : def.multiple
                      ? 'Ajouter des photos'
                      : 'Téléverser / remplacer'}
                </button>
              </div>
            </div>
            {def.isVideo && (
              <p className="mt-2 text-xs text-bark-soft">
                Formats acceptés : MP4 (H.264) ou WebM — 50 Mo maximum.
              </p>
            )}

            {msg && (
              <div
                className={`mt-4 rounded-2xl px-5 py-4 text-sm ${
                  msg.type === 'ok'
                    ? 'bg-leaf-soft font-medium text-leaf-dark'
                    : 'border border-terra/30 bg-terra-soft/40 font-medium text-terra-dark'
                }`}
              >
                {msg.text}
                {msg.detail && msg.detail !== msg.text && (
                  <p className="mt-1 text-xs font-normal opacity-80">{msg.detail}</p>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-sand/60 px-4 py-3 text-sm text-bark-soft">
                Aucun média — la section correspondante affichera un fond uni terracotta ou sera masquée.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-4">
                {items.map((m, i) => (
                  <div key={m.id} className="group relative">
                    <div className="overflow-hidden rounded-xl bg-sand">
                      {def.isVideo ? (
                        <video src={m.url} controls muted playsInline className="h-28 w-44 object-cover" />
                      ) : (
                        <img src={m.url} alt="" className="h-28 w-44 object-cover" />
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await setMediaActive(m.id, !m.active)
                            refetch()
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Mise à jour impossible')
                          }
                        }}
                        className={`btn rounded-full px-2.5 py-0.5 font-semibold ${
                          m.active ? 'bg-leaf-soft text-leaf-dark' : 'bg-sand text-bark-soft'
                        }`}
                        aria-pressed={m.active}
                      >
                        {m.active ? 'Actif' : 'Inactif'}
                      </button>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-terra-dark hover:underline"
                      >
                        Ouvrir l'URL
                      </a>
                    </div>
                    {def.multiple && (
                      <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => reorderMedia(m.id, -1, def.kind)}
                          className="btn rounded-full bg-bark px-2 py-0.5 text-xs text-cream"
                          disabled={i === 0}
                          aria-label="Monter"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => reorderMedia(m.id, 1, def.kind)}
                          className="btn rounded-full bg-bark px-2 py-0.5 text-xs text-cream"
                          disabled={i === items.length - 1}
                          aria-label="Descendre"
                        >
                          →
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Supprimer ce média ?')) {
                          try {
                            await deleteMedia(m.id, m.url)
                            refetch()
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Suppression impossible')
                          }
                        }
                      }}
                      className="btn absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-terra text-xs text-cream opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Supprimer le média"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
