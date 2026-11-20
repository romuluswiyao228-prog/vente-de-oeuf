import { useRef, useState, type FormEvent } from 'react'
import { deleteBlogPost, uploadFile, upsertBlogPost } from '../../lib/store'
import type { BlogPost } from '../../lib/types'
import SmartImg from '../../components/SmartImg'

const inputCls =
  'w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-bark focus:border-terra focus:outline-none'

interface Props {
  posts: BlogPost[]
  refetch: () => void
}

export default function BlogTab({ posts, refetch }: Props) {
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const openNew = () => {
    setEditing({ title: '', excerpt: '', content: '', published: true })
    setImageUrl(null)
  }

  const openEdit = (p: BlogPost) => {
    setEditing(p)
    setImageUrl(p.image_url)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setImageUrl(await uploadFile(file, 'blog'))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Envoi refusé')
    }
    e.target.value = ''
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing?.title) return
    setSaving(true)
    try {
      await upsertBlogPost({ ...editing, image_url: imageUrl })
      setEditing(null)
      refetch()
    } catch (err) {
      console.error(err)
      alert('Erreur lors de l’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <form onSubmit={submit} className="rounded-[2rem] bg-white p-8 shadow-card">
        <h2 className="font-display text-xl font-semibold text-bark">
          {editing.id ? 'Modifier l’article' : 'Nouvel article'}
        </h2>
        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bark">Titre</span>
            <input required value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bark">Extrait</span>
            <textarea rows={2} value={editing.excerpt ?? ''} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bark">Contenu</span>
            <textarea rows={10} value={editing.content ?? ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className={inputCls} />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-bark">Image à la une</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <div className="flex items-center gap-4">
              <SmartImg src={imageUrl} alt="" className="h-20 w-28 rounded-xl object-cover" />
              <button type="button" onClick={() => fileRef.current?.click()} className="btn rounded-full border border-line bg-cream px-5 py-2.5 text-sm font-semibold text-bark hover:border-terra-soft">
                {imageUrl ? 'Remplacer' : 'Ajouter une image'}
              </button>
              {imageUrl && (
                <button type="button" onClick={() => setImageUrl(null)} className="btn text-sm font-semibold text-terra-dark hover:underline">
                  Retirer
                </button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={editing.published ?? true} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="h-4 w-4 accent-terra" />
            <span className="text-sm font-medium text-bark">Publié</span>
          </label>
        </div>
        <div className="mt-8 flex gap-3">
          <button type="submit" disabled={saving} className="btn rounded-full bg-terra px-7 py-3 text-sm font-semibold text-cream hover:bg-terra-dark disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={() => setEditing(null)} className="btn rounded-full border border-line px-7 py-3 text-sm font-semibold text-bark">
            Annuler
          </button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button onClick={openNew} className="btn rounded-full bg-terra px-6 py-3 text-sm font-semibold text-cream hover:bg-terra-dark">
          + Nouvel article
        </button>
      </div>
      <div className="space-y-4">
        {posts.length === 0 && (
          <p className="rounded-[2rem] bg-white p-10 text-center text-bark-soft shadow-card">
            Aucun article. Cliquez sur « Nouvel article ».
          </p>
        )}
        {posts.map((p) => (
          <div key={p.id} className="card-lift flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-card">
            <div className="flex items-center gap-4">
              <SmartImg src={p.image_url} alt="" className="h-14 w-20 rounded-xl object-cover" />
              <div>
                <p className="font-display font-semibold text-bark">{p.title}</p>
                <p className="text-xs text-bark-soft">
                  /blog/{p.slug} · {p.published ? 'Publié' : 'Brouillon'}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => openEdit(p)} className="btn text-sm font-semibold text-terra-dark hover:underline">
                Modifier
              </button>
              <button
                onClick={async () => {
                  if (confirm('Supprimer cet article ?')) {
                    await deleteBlogPost(p.id, p.image_url)
                    refetch()
                  }
                }}
                className="btn text-sm font-semibold text-terra-dark hover:underline"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
