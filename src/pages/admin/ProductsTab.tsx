import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { deleteProduct, formatPrice, uploadFile, upsertProduct } from '../../lib/store'
import type { Product, ProductStatus, ProductType } from '../../lib/types'
import { PRODUCT_TYPES } from '../../lib/types'
import SmartImg from '../../components/SmartImg'

const inputCls =
  'w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-bark focus:border-terra focus:outline-none'

interface Props {
  products: Product[]
  refetch: () => void
}

export default function ProductsTab({ products, refetch }: Props) {
  const [editing, setEditing] = useState<Partial<Product> | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const openNew = () => {
    setEditing({ name: '', type: 'oeufs', description: '', price_fcfa: 0, stock: 0, status: 'actif', featured: false })
    setImages([])
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setImages(p.images ?? [])
  }

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const f of files) {
      try {
        const url = await uploadFile(f, 'produits')
        setImages((prev) => [...prev, url])
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Envoi refusé')
      }
    }
    e.target.value = ''
  }

  const moveImage = (i: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing?.name) return
    setSaving(true)
    try {
      await upsertProduct({ ...editing, images })
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
          {editing.id ? 'Modifier le produit' : 'Nouveau produit'}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-bark">Nom</span>
            <input
              required
              value={editing.name ?? ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bark">Type</span>
            <select
              value={editing.type}
              onChange={(e) => setEditing({ ...editing, type: e.target.value as ProductType })}
              className={inputCls}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bark">Prix (FCFA)</span>
            <input
              type="number"
              min={0}
              required
              value={editing.price_fcfa ?? 0}
              onChange={(e) => setEditing({ ...editing, price_fcfa: Number(e.target.value) })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bark">Stock</span>
            <input
              type="number"
              min={0}
              value={editing.stock ?? 0}
              onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bark">Statut</span>
            <select
              value={editing.status ?? 'actif'}
              onChange={(e) => setEditing({ ...editing, status: e.target.value as ProductStatus })}
              className={inputCls}
            >
              <option value="actif">Actif</option>
              <option value="archive">Archivé</option>
            </select>
          </label>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={editing.featured ?? false}
              onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
              className="h-4 w-4 accent-terra"
            />
            <span className="text-sm font-medium text-bark">Mettre à la une</span>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-bark">Description</span>
            <textarea
              rows={4}
              value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>

        <div className="mt-6">
          <span className="mb-1.5 block text-sm font-medium text-bark">Photos (plusieurs, réordonnables)</span>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn rounded-full border border-line bg-cream px-5 py-2.5 text-sm font-semibold text-bark hover:border-terra-soft"
          >
            + Ajouter des photos
          </button>
          {images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={url + i} className="group relative">
                  <SmartImg src={url} alt="" className="h-24 w-24 rounded-xl object-cover" />
                  <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => moveImage(i, -1)} className="btn rounded-full bg-bark px-2 py-0.5 text-xs text-cream">←</button>
                    <button type="button" onClick={() => moveImage(i, 1)} className="btn rounded-full bg-bark px-2 py-0.5 text-xs text-cream">→</button>
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="btn rounded-full bg-terra px-2 py-0.5 text-xs text-cream"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          + Nouveau produit
        </button>
      </div>
      <div className="overflow-x-auto rounded-[2rem] bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-bark-soft">
              <th className="px-5 py-4">Produit</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Prix</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Statut</th>
              <th className="px-5 py-4">À la une</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-bark-soft">
                  Aucun produit. Cliquez sur « Nouveau produit ».
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <SmartImg src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="font-medium text-bark">{p.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-bark-soft">{PRODUCT_TYPES.find((t) => t.value === p.type)?.label}</td>
                <td className="px-5 py-4 font-semibold text-terra-dark">{formatPrice(p.price_fcfa)}</td>
                <td className="px-5 py-4 text-bark-soft">{p.stock}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === 'actif' ? 'bg-leaf-soft text-leaf-dark' : 'bg-sand text-bark-soft'}`}>
                    {p.status === 'actif' ? 'Actif' : 'Archivé'}
                  </span>
                </td>
                <td className="px-5 py-4">{p.featured ? '★' : '—'}</td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => openEdit(p)} className="btn text-sm font-semibold text-terra-dark hover:underline">
                    Modifier
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Supprimer ce produit ?')) {
                        await deleteProduct(p.id, p.images ?? [])
                        refetch()
                      }
                    }}
                    className="btn ml-3 text-sm font-semibold text-terra-dark hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
