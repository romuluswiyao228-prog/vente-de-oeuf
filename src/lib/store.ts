import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import type {
  BlogPost,
  DeliveryZone,
  MediaItem,
  MediaKind,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  SiteTexts,
} from './types'
import { DEFAULT_TEXTS } from './defaults'

/* ------------------------------ Utilitaires ------------------------------ */

export function formatPrice(fcfa: number): string {
  return `${fcfa.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`
}

export function whatsappLink(number: string, message: string): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function orderMessage(product: Product, quantity: number, texts: SiteTexts): string {
  const total = product.price_fcfa * quantity
  return [
    `Bonjour ${texts.site_name} 👋`,
    ``,
    `Je souhaite commander :`,
    `• ${product.name} — ${quantity} × ${formatPrice(product.price_fcfa)} = ${formatPrice(total)}`,
    ``,
    texts.whatsapp_order_note,
    `Merci de me confirmer la disponibilité et les modalités de livraison/paiement.`,
  ].join('\n')
}

/* --------------------------------- Hooks --------------------------------- */

function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await fetcher()
        if (!cancelled) setData(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading }
}

export function useSiteTexts(): SiteTexts {
  const { data } = useFetch(async () => {
    if (!supabase) return null
    const { data } = await supabase.from('site_texts').select('key, value')
    const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Partial<SiteTexts>
    return { ...DEFAULT_TEXTS, ...map }
  }, [])
  return data ?? DEFAULT_TEXTS
}

export function useMedia(kind?: MediaKind): MediaItem[] {
  const { data } = useFetch(async () => {
    if (!supabase) return []
    let q = supabase.from('media').select('*').eq('active', true).order('sort_order')
    if (kind) q = q.eq('kind', kind)
    const { data, error } = await q
    if (error) console.warn('useMedia:', error.message)
    return (data ?? []) as MediaItem[]
  }, [kind])
  return data ?? []
}

export function useProducts(type?: string, featuredOnly = false): Product[] {
  const { data } = useFetch(async () => {
    if (!supabase) return []
    let q = supabase.from('products').select('*').eq('status', 'actif').order('created_at', { ascending: false })
    if (type) q = q.eq('type', type)
    const { data } = await q
    const items = (data ?? []) as Product[]
    return featuredOnly ? items.filter((p) => p.featured) : items
  }, [type, featuredOnly])
  return data ?? []
}

export function useProduct(id: string | undefined): Product | null {
  const { data } = useFetch(async () => {
    if (!supabase || !id) return null
    const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
    return (data as Product) ?? null
  }, [id])
  return data
}

export function useBlogPosts(): BlogPost[] {
  const { data } = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('blog_posts').select('*').eq('published', true).order('created_at', { ascending: false })
    return (data ?? []) as BlogPost[]
  }, [])
  return data ?? []
}

export function useBlogPost(slug: string | undefined): BlogPost | null {
  const { data } = useFetch(async () => {
    if (!supabase || !slug) return null
    const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).maybeSingle()
    return (data as BlogPost) ?? null
  }, [slug])
  return data
}

export function useDeliveryZones(): DeliveryZone[] {
  const { data } = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('delivery_zones').select('*').eq('active', true).order('sort_order')
    return (data ?? []) as DeliveryZone[]
  }, [])
  return data ?? []
}

export function usePaymentMethods(): PaymentMethod[] {
  const { data } = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('payment_methods').select('*').eq('active', true).order('sort_order')
    return (data ?? []) as PaymentMethod[]
  }, [])
  return data ?? []
}

/* ------------------------------ Admin hooks ------------------------------- */

export function useAdminSession() {
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true)
      setIsAdmin(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setSessionReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessionReady) return
    if (!supabase || !session) {
      setIsAdmin(false)
      return
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === 'admin'))
  }, [session, sessionReady])

  return { session, isAdmin, configured: isSupabaseConfigured }
}

export async function adminSignIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function adminSignOut() {
  await supabase?.auth.signOut()
}

/**
 * Inscription admin : si aucun admin n'existe encore, le premier compte
 * créé devient automatiquement administrateur.
 */
export async function adminSignUp(email: string, password: string, fullName: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error

  const userId = data.user?.id
  if (!userId) return 'confirm' // e-mail de confirmation requis

  // claim_admin() est security definer : le comptage des admins
  // n'est pas faussé par la RLS (seul le premier compte devient admin)
  const { data: claimed } = await supabase.rpc('claim_admin')
  return claimed ? 'ok' : 'member'
}

export async function uploadSiteMedia(file: File, kind: MediaKind): Promise<string> {
  return uploadFile(file, kind)
}

/** Upload vers le bucket Storage "media". Lève une erreur explicite en cas d'échec. */
export async function uploadFile(file: File, folder: string): Promise<string> {
  if (!supabase) throw new Error('Supabase non configuré')
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (error) throw new Error(`Envoi refusé : ${error.message}`)
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

/** Insère une ligne dans la table media (active par défaut) et la retourne. */
export async function addMedia(kind: MediaKind, url: string): Promise<MediaItem> {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data: last } = await supabase
    .from('media')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const { data, error } = await supabase
    .from('media')
    .insert({ kind, url, active: true, sort_order: (last?.[0]?.sort_order ?? 0) + 1 })
    .select()
    .single()
  if (error) throw new Error(`Enregistrement refusé : ${error.message}`)
  return data as MediaItem
}

export async function deleteMedia(id: string, url: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { error } = await supabase.from('media').delete().eq('id', id)
  if (error) throw new Error(`Suppression refusée : ${error.message}`)
  const path = url.split('/media/')[1]
  if (path) await supabase.storage.from('media').remove([path])
}

export async function setMediaActive(id: string, active: boolean) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { error } = await supabase.from('media').update({ active }).eq('id', id)
  if (error) throw new Error(`Mise à jour refusée : ${error.message}`)
}

export interface MediaTestResult {
  label: string
  ok: boolean
  detail: string
}

/** Vérifie que toute la chaîne médias fonctionne (bucket, droits, table). */
export async function testMediaAccess(): Promise<MediaTestResult[]> {
  if (!supabase) {
    return [{ label: 'Supabase configuré', ok: false, detail: 'Variables VITE_SUPABASE_* manquantes' }]
  }
  const results: MediaTestResult[] = []

  const { error: tableErr } = await supabase.from('media').select('id', { head: true }).limit(1)
  results.push({
    label: 'Lecture publique de la table media',
    ok: !tableErr,
    detail: tableErr?.message ?? 'OK',
  })

  const { error: listErr } = await supabase.storage.from('media').list('', { limit: 1 })
  results.push({
    label: 'Bucket media accessible en lecture',
    ok: !listErr,
    detail: listErr?.message ?? 'OK',
  })

  const probe = `__test_${Date.now()}.txt`
  const { error: writeErr } = await supabase.storage
    .from('media')
    .upload(probe, new File(['test'], probe, { type: 'text/plain' }), { upsert: true })
  if (writeErr) {
    results.push({ label: "Droit d'écriture admin (Storage)", ok: false, detail: writeErr.message })
  } else {
    await supabase.storage.from('media').remove([probe])
    results.push({ label: "Droit d'écriture admin (Storage)", ok: true, detail: 'OK' })
  }

  return results
}

export async function reorderMedia(id: string, dir: -1 | 1, kind: MediaKind) {
  if (!supabase) return
  const { data: all } = await supabase.from('media').select('*').eq('kind', kind).order('sort_order')
  if (!all) return
  const idx = all.findIndex((m) => m.id === id)
  const swap = all[idx + dir]
  if (!swap) return
  const current = all[idx]
  await supabase.from('media').update({ sort_order: swap.sort_order }).eq('id', current.id)
  await supabase.from('media').update({ sort_order: current.sort_order }).eq('id', swap.id)
}

export function useAdminData() {
  const refetch = useCallback(() => setTick((t) => t + 1), [])
  const [tick, setTick] = useState(0)

  const products = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    return (data ?? []) as Product[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]).data ?? []

  const media = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('media').select('*').order('kind').order('sort_order')
    return (data ?? []) as MediaItem[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]).data ?? []

  const texts = useFetch(async () => {
    if (!supabase) return null
    const { data } = await supabase.from('site_texts').select('key, value')
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Partial<SiteTexts>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]).data ?? null

  const zones = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('delivery_zones').select('*').order('sort_order')
    return (data ?? []) as DeliveryZone[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]).data ?? []

  const payments = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('payment_methods').select('*').order('sort_order')
    return (data ?? []) as PaymentMethod[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]).data ?? []

  const orders = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    return (data ?? []) as Order[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]).data ?? []

  const posts = useFetch(async () => {
    if (!supabase) return []
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    return (data ?? []) as BlogPost[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]).data ?? []

  return { products, media, texts, zones, payments, orders, posts, refetch }
}

export async function saveTexts(values: Record<string, string>) {
  if (!supabase) return
  for (const [key, value] of Object.entries(values)) {
    await supabase.from('site_texts').upsert({ key, value })
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (!supabase) return
  // Le stock n'est décrémenté qu'à la première confirmation (nouvelle → confirmée)
  if (status === 'confirmee') {
    const { data: order } = await supabase.from('orders').select('status, items').eq('id', id).maybeSingle()
    if (order && order.status === 'nouvelle' && Array.isArray(order.items)) {
      for (const item of order.items as OrderItem[]) {
        if (!item.product_id || !item.quantity) continue
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .maybeSingle()
        if (product) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, product.stock - item.quantity) })
            .eq('id', item.product_id)
        }
      }
    }
  }
  await supabase.from('orders').update({ status }).eq('id', id)
}

/* ------------------------- Mutations admin (suite) ------------------------ */

export async function upsertProduct(p: Partial<Product>) {
  if (!supabase) return null
  if (p.id) {
    const { error } = await supabase.from('products').update(p).eq('id', p.id)
    if (error) throw error
    return p.id
  }
  const { data, error } = await supabase.from('products').insert({
    name: '',
    type: 'oeufs',
    price_fcfa: 0,
    stock: 0,
    status: 'actif',
    featured: false,
    images: [],
    description: '',
    ...p,
  }).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function deleteProduct(id: string, imageUrls: string[]) {
  if (!supabase) return
  await supabase.from('products').delete().eq('id', id)
  const paths = imageUrls.map((u) => u.split('/media/')[1]).filter(Boolean)
  if (paths.length) await supabase.storage.from('media').remove(paths)
}

export async function saveZone(z: Partial<DeliveryZone>) {
  if (!supabase) return
  if (z.id) {
    await supabase.from('delivery_zones').update(z).eq('id', z.id)
  } else {
    await supabase.from('delivery_zones').insert({ fee_fcfa: 0, active: true, sort_order: 99, ...z })
  }
}

export async function deleteZone(id: string) {
  if (!supabase) return
  await supabase.from('delivery_zones').delete().eq('id', id)
}

export async function savePayment(p: Partial<PaymentMethod>) {
  if (!supabase || !p.id) return
  await supabase.from('payment_methods').update({ active: p.active, label: p.label, details: p.details }).eq('id', p.id)
}

export async function upsertBlogPost(p: Partial<BlogPost>) {
  if (!supabase) return null
  const slug =
    p.slug ||
    (p.title ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') ||
    `article-${Date.now()}`
  const payload = { ...p, slug }
  if (p.id) {
    const { error } = await supabase.from('blog_posts').update(payload).eq('id', p.id)
    if (error) throw error
    return p.id
  }
  const { data, error } = await supabase.from('blog_posts').insert({
    excerpt: '',
    content: '',
    image_url: null,
    published: true,
    ...payload,
  }).select('id').single()
  if (error) throw error
  return data.id as string
}

/* ------------------------------ Commandes -------------------------------- */

export interface CreateOrderInput {
  customer_name: string
  phone: string
  email?: string
  fulfillment: 'livraison' | 'retrait'
  zone_id?: string | null
  address?: string
  payment_method?: string
  note?: string
  /** Uniquement product_id + quantité : prix et stock sont recalculés en base. */
  items: { product_id: string; quantity: number }[]
}

export interface CreatedOrder {
  id: string
  reference: string
  subtotal_fcfa: number
  delivery_fee_fcfa: number
  total_fcfa: number
  fulfillment: 'livraison' | 'retrait'
  zone: string
  items: OrderItem[]
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc('create_order', {
    p_customer_name: input.customer_name,
    p_phone: input.phone,
    p_email: input.email ?? '',
    p_fulfillment: input.fulfillment,
    p_zone_id: input.fulfillment === 'livraison' ? input.zone_id ?? null : null,
    p_address: input.address ?? '',
    p_payment_method: input.payment_method ?? '',
    p_note: input.note ?? '',
    p_items: input.items,
  })
  if (error) throw error
  return data as CreatedOrder
}

export async function deleteBlogPost(id: string, imageUrl?: string | null) {
  if (!supabase) return
  await supabase.from('blog_posts').delete().eq('id', id)
  if (imageUrl) {
    const path = imageUrl.split('/media/')[1]
    if (path) await supabase.storage.from('media').remove([path])
  }
}
