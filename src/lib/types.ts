export type ProductType = 'oeufs' | 'poules' | 'poussins' | 'canards' | 'materiel'
export type ProductStatus = 'actif' | 'archive'
export type OrderStatus = 'nouvelle' | 'confirmee' | 'expediee' | 'livree' | 'annulee'
export type PaymentStatus = 'non_paye' | 'paye'
export type MediaKind = 'hero_video' | 'story_video' | 'strip_photo' | 'cta_image' | 'logo'

export interface Product {
  id: string
  name: string
  type: ProductType
  /** Race (essentiellement pour les œufs : Marans, Issa Brown, etc.). '' si non renseignée. */
  race: string
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
  payment_status: PaymentStatus
  payment_ref: string | null
  paid_at: string | null
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

/* --------------------------------- Ferme --------------------------------- */

export type BatchKind = 'pondeuses' | 'reproducteurs' | 'poussins' | 'autre'
export type BatchStatus = 'actif' | 'terminee'
export type BatchEventType = 'arrivee' | 'mortalite' | 'vente' | 'transfert' | 'ajustement'
export type EggMovementKind =
  | 'ponte'
  | 'casse'
  | 'incubation'
  | 'perte'
  | 'transfert_boutique'
  | 'ajustement'
  | 'vente'
  | 'don'
export type EggColor = 'roux' | 'blanc'
export type Caliber = 'petit' | 'moyen' | 'gros'
export type PriceChannel = 'ferme' | 'boutique'
export type ClientType = 'revendeur' | 'boutique' | 'particulier'
export type PaymentMethodKind = 'especes' | 'mobile_money' | 'autre'
export type SupplyCategory = 'aliment' | 'medicament' | 'vaccin' | 'materiel'
export type ExpenseCategory = 'aliment' | 'soins' | 'main_oeuvre' | 'transport' | 'autre'
export type IncubationStatus = 'en_cours' | 'terminee'

export interface FarmBatch {
  id: string
  name: string
  species: string
  breed: string
  kind: BatchKind
  arrived_on: string | null
  initial_count: number
  status: BatchStatus
  note: string
  created_at: string
  /** Présent via la vue farm_batches_view */
  effectif_actuel?: number
  /** Couleur des œufs : 'roux', 'blanc' ou '' (colonne farm_batches.egg_color) */
  egg_color?: string
  /** Couleur d'affichage de la bande (hex, ex. '#a0522d') */
  display_color?: string
  /** Calibre indicatif : 'petit', 'moyen', 'gros' ou '' */
  caliber?: string
}

export interface FarmBatchEvent {
  id: string
  batch_id: string
  date: string
  type: BatchEventType
  qty: number
  note: string
  created_at: string
}

export interface EggMovement {
  id: string
  date: string
  kind: EggMovementKind
  qty_eggs: number
  batch_id: string | null
  product_id: string | null
  note: string
  created_at: string
}

export interface Incubation {
  id: string
  batch_id: string | null
  started_on: string
  eggs_set: number
  incubation_days: number
  expected_hatch_on: string
  hatched_count: number | null
  status: IncubationStatus
  note: string
  created_at: string
}

export interface FarmSupply {
  id: string
  name: string
  category: SupplyCategory
  unit: string
  alert_threshold: number | null
  expiry_date: string | null
  note: string
  created_at: string
  /** Présent via la vue farm_supplies_view */
  stock?: number
}

export interface SupplyMovement {
  id: string
  supply_id: string
  date: string
  qty: number
  unit_cost: number | null
  note: string
  created_at: string
}

export interface FarmExpense {
  id: string
  date: string
  /** Catégorie libre : valeur du catalogue ou ancienne valeur historique */
  category: string
  amount: number
  note: string
  supply_id: string | null
  /** Rattachement facultatif à une bande (coût de revient par bande) */
  batch_id?: string | null
  created_at: string
}

/** Prix d'une bande pour un canal, valable à partir de effective_from. */
export interface BatchPrice {
  id: string
  batch_id: string
  channel: PriceChannel
  price_fcfa: number
  effective_from: string
  note: string
  created_at: string
}

/** Événement daté de la ferme (changement de local, aliment, maladie…). */
export interface FarmEvent {
  id: string
  date: string
  batch_id: string | null
  title: string
  note: string
  created_at: string
}

/** Client de la ferme (revendeur, boutique, particulier). */
export interface FarmClient {
  id: string
  name: string
  phone: string
  type: ClientType
  note: string
  active: boolean
  created_at: string
}

/** Vente en gros (ferme ou boutique), hors site. */
export interface FarmSale {
  id: string
  date: string
  client_id: string | null
  channel: PriceChannel
  paid_amount: number
  /** Part encaissée à la saisie de la vente (trésorerie) */
  entry_paid?: number
  total_fcfa: number
  note: string
  created_at: string
}

export interface FarmSaleLine {
  id: string
  sale_id: string
  batch_id: string
  plateaux: number
  oeufs: number
  /** Prix unitaire par plateau (FCFA) */
  unit_price: number
}

/** Encaissement client, réparti sur les ventes impayées. */
export interface ClientPayment {
  id: string
  client_id: string
  date: string
  amount: number
  method: PaymentMethodKind
  note: string
  created_at: string
}

export interface FarmTask {
  id: string
  title: string
  due_on: string
  done: boolean
  note: string
  created_at: string
}

export interface FarmAlert {
  id: string
  level: 'warn' | 'info'
  text: string
}

export const BATCH_KINDS: { value: BatchKind; label: string }[] = [
  { value: 'pondeuses', label: 'Pondeuses' },
  { value: 'reproducteurs', label: 'Reproducteurs' },
  { value: 'poussins', label: 'Poussins' },
  { value: 'autre', label: 'Autre' },
]

export const BATCH_EVENT_TYPES: { value: BatchEventType; label: string }[] = [
  { value: 'arrivee', label: 'Arrivée' },
  { value: 'mortalite', label: 'Mortalité' },
  { value: 'vente', label: 'Vente' },
  { value: 'transfert', label: 'Transfert' },
  { value: 'ajustement', label: 'Ajustement' },
]

export const EGG_MOVEMENT_KINDS: { value: EggMovementKind; label: string }[] = [
  { value: 'ponte', label: 'Ponte' },
  { value: 'casse', label: 'Casse' },
  { value: 'incubation', label: 'Incubation' },
  { value: 'perte', label: 'Perte' },
  { value: 'transfert_boutique', label: 'Transfert boutique' },
  { value: 'ajustement', label: 'Ajustement' },
  { value: 'vente', label: 'Vente' },
  { value: 'don', label: 'Don' },
]

export const SUPPLY_CATEGORIES: { value: SupplyCategory; label: string }[] = [
  { value: 'aliment', label: 'Aliments' },
  { value: 'medicament', label: 'Médicaments' },
  { value: 'vaccin', label: 'Vaccins' },
  { value: 'materiel', label: 'Matériel' },
]

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'aliment', label: 'Aliment' },
  { value: 'soins', label: 'Soins' },
  { value: 'main_oeuvre', label: 'Main-d’œuvre' },
  { value: 'transport', label: 'Transport' },
  { value: 'autre', label: 'Autre' },
]

export const SALE_CHANNELS: { value: PriceChannel; label: string }[] = [
  { value: 'ferme', label: 'Ferme' },
  { value: 'boutique', label: 'Boutique' },
]

export const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: 'revendeur', label: 'Revendeur' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'particulier', label: 'Particulier' },
]

export const PAYMENT_METHODS: { value: PaymentMethodKind; label: string }[] = [
  { value: 'especes', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'autre', label: 'Autre' },
]

/** Catégorie de dépense du catalogue (nom libre, activable/désactivable). */
export interface ExpenseCategoryItem {
  id: string
  name: string
  active: boolean
  sort_order: number
}

export type CashMovementKind =
  | 'apport_promoteur'
  | 'remboursement'
  | 'retrait'
  | 'autre_entree'
  | 'autre_sortie'

/** Mouvement de caisse : apport, remboursement, retrait, autre entrée/sortie. */
export interface CashMovement {
  id: string
  date: string
  kind: CashMovementKind
  amount: number
  note: string
  created_at: string
}

export const CASH_MOVEMENT_KINDS: { value: CashMovementKind; label: string; sign: 1 | -1 }[] = [
  { value: 'apport_promoteur', label: 'Apport du promoteur', sign: 1 },
  { value: 'remboursement', label: 'Remboursement', sign: -1 },
  { value: 'retrait', label: 'Retrait', sign: -1 },
  { value: 'autre_entree', label: 'Autre entrée', sign: 1 },
  { value: 'autre_sortie', label: 'Autre sortie', sign: -1 },
]

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'nouvelle', label: 'Nouvelle' },
  { value: 'confirmee', label: 'Confirmée' },
  { value: 'expediee', label: 'Expédiée' },
  { value: 'livree', label: 'Livrée' },
  { value: 'annulee', label: 'Annulée' },
]
