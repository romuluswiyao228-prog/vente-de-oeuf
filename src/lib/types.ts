export type ProductType = 'oeufs' | 'poules' | 'poussins' | 'canards' | 'materiel'
export type ProductStatus = 'actif' | 'archive'
export type OrderStatus = 'nouvelle' | 'confirmee' | 'expediee' | 'livree' | 'annulee'
export type MediaKind = 'hero_video' | 'story_video' | 'strip_photo' | 'cta_image' | 'logo'

export interface Product {
  id: string
  name: string
  type: ProductType
  description: string
  price_fcfa: number
  stock: number
  status: ProductStatus
  featured: boolean
  images: string[]
  created_at: string
}

export interface SiteTexts {
  site_name: string
  tagline: string
  marquee: string
  hero_eyebrow: string
  hero_title: string
  hero_subtitle: string
  hero_cta_primary: string
  hero_cta_secondary: string
  contact_email: string
  contact_phone: string
  contact_address: string
  whatsapp_number: string
  whatsapp_order_note: string
  social_facebook: string
  social_instagram: string
  social_youtube: string
}

export interface MediaItem {
  id: string
  kind: MediaKind
  url: string
  sort_order: number
  active: boolean
}

export interface DeliveryZone {
  id: string
  name: string
  fee_fcfa: number
  active: boolean
  sort_order: number
}

export interface PaymentMethod {
  id: string
  label: string
  details: string
  active: boolean
  sort_order: number
}

export interface OrderItem {
  product_id?: string
  name: string
  quantity: number
  price_fcfa: number
}

export type OrderFulfillment = 'livraison' | 'retrait'

export interface Order {
  id: string
  reference: string | null
  customer_name: string
  phone: string
  email: string
  address: string
  zone: string
  fulfillment: OrderFulfillment
  items: OrderItem[]
  subtotal_fcfa: number
  delivery_fee_fcfa: number
  total_fcfa: number
  payment_method: string
  status: OrderStatus
  note: string
  created_at: string
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  image_url: string | null
  published: boolean
  created_at: string
}

export const PRODUCT_TYPES: { value: ProductType; label: string; tagline: string }[] = [
  { value: 'oeufs', label: 'Œufs fécondés', tagline: 'Des œufs à couver, calibrés et marqués à la date de ponte' },
  { value: 'poules', label: 'Poules', tagline: 'Pondeuses rustiques et races d’ornement' },
  { value: 'poussins', label: 'Poussins', tagline: 'Petits arrivés, élevés en plein air' },
  { value: 'canards', label: 'Canards', tagline: 'Coureurs et reproducteurs pour bassins et basse-cour' },
  { value: 'materiel', label: 'Matériel', tagline: 'Couveuses, mangeoires, accessoires' },
]

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'nouvelle', label: 'Nouvelle' },
  { value: 'confirmee', label: 'Confirmée' },
  { value: 'expediee', label: 'Expédiée' },
  { value: 'livree', label: 'Livrée' },
  { value: 'annulee', label: 'Annulée' },
]
