import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import type {
  BlogPost,
  DeliveryZone,
  MediaItem,
  MediaKind,
  Order,
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
    `Merci de me confirmer la disponibilité et les modalités de livraison/paiement.`,
  ].join('\n')
}

async function uploadMedia(file: File, kind: string): Promise<string | null> {
  if (!supabase) return null
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
  if (error) {
    console.error('Upload error:', error)
    return null
  }
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
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
    const { data } = await q
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase) {
      setIsAdmin(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) {
      setIsAdmin(session ? false : null)
      return
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === 'admin'))
  }, [session])

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

export async function uploadSiteMedia(file: File, kind: MediaKind): Promise<string | null> {
  return uploadMedia(file, kind)
}

export async function addMedia(kind: MediaKind, url: string) {
  if (!supabase) return
  const { data: last } = await supabase.from('media').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  await supabase.from('media').insert({ kind, url, sort_order: (last?.[0]?.sort_order ?? 0) + 1 })
}

export async function deleteMedia(id: string, url: string) {
  if (!supabase) return
  await supabase.from('media').delete().eq('id', id)
  const path = url.split('/media/')[1]
  if (path) await supabase.storage.from('media').remove([path])
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
  await supabase.from('orders').update({ status }).eq('id', id)
}
