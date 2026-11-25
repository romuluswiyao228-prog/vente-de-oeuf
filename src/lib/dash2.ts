import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/* ------------------------------- Types ---------------------------------- */

export interface Dash2BatchProd {
  batch_id: string
  name: string
  display_color: string | null
  sains: number
  casses: number
}

export interface Dash2Stock {
  batch_id: string
  name: string
  display_color: string | null
  egg_color: string | null
  caliber: string | null
  stock_oeufs: number
}

export interface Dash2Summary {
  from: string
  to: string
  eggs_per_tray: number
  ventes: number
  commandes: number
  depenses: number
  benefice: number
  a_encaisser: number
  production_aujourdhui: Dash2BatchProd[]
  production_veille: { sains: number; casses: number }
  stock: Dash2Stock[]
}

export interface Dash2SeriesPoint {
  label: string
  valeur: number
}

export type Dash2Metric =
  | 'production'
  | 'ventes'
  | 'commandes'
  | 'depenses'
  | 'benefice'
  | 'tresorerie'

export interface Dash2BatchRow {
  batch_id: string
  name: string
  display_color: string | null
  egg_color: string | null
  production_oeufs: number
  production_plateaux: number
  ca_fcfa: number
  stock_oeufs: number
}

export interface Dash2Top {
  type: 'produit' | 'client'
  name: string
  quantite: number
  montant: number
}

export interface Dash2ExpenseCat {
  categorie: string
  montant: number
}

export interface Dash2Activity {
  at: string
  date: string
  type: 'vente' | 'production' | 'mouvement' | 'depense' | 'commande' | 'encaissement' | 'caisse'
  label: string
  montant: number | null
  status: string
  ref_id: string
}

/* ------------------------------- Fetch ---------------------------------- */

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const fetchDash2Summary = (from: string, to: string) =>
  rpc<Dash2Summary>('dash2_summary', { p_from: from, p_to: to })

export const fetchDash2Series = (metric: Dash2Metric | `production:${string}`, from: string, to: string, group: 'jour' | 'mois' = 'jour') =>
  rpc<Dash2SeriesPoint[]>('dash2_series', { p_metric: metric, p_from: from, p_to: to, p_group: group })

export const fetchDash2ByBatch = (from: string, to: string) =>
  rpc<Dash2BatchRow[]>('dash2_by_batch', { p_from: from, p_to: to })

export const fetchDash2Top = (from: string, to: string) =>
  rpc<Dash2Top[]>('dash2_top', { p_from: from, p_to: to })

export const fetchDash2ExpensesByCategory = (from: string, to: string) =>
  rpc<Dash2ExpenseCat[]>('dash2_expenses_by_category', { p_from: from, p_to: to })

export const fetchDash2Activity = (limit = 40) =>
  rpc<Dash2Activity[]>('dash2_activity', { p_limit: limit })

/* --------------------------- Temps réel --------------------------------- */

const REALTIME_TABLES = [
  'egg_movements',
  'farm_sales',
  'client_payments',
  'farm_expenses',
  'cash_movements',
  'farm_events',
  'orders',
] as const

/**
 * S'abonne aux tables du tableau de bord. `onChange(table)` est appelé au
 * plus une fois par seconde (regroupement des événements). Retourne la
 * fonction de désabonnement.
 */
export function subscribeDash2(onChange: (table: string) => void): () => void {
  if (!supabase) return () => {}
  const client = supabase
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingTable = ''
  const fire = (table: string) => {
    pendingTable = table
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      onChange(pendingTable)
    }, 1000)
  }
  const channel = client.channel('dash2-live')
  for (const table of REALTIME_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => fire(table),
    )
  }
  channel.subscribe()
  return () => {
    if (timer) clearTimeout(timer)
    void client.removeChannel(channel)
  }
}

/* ------------------------- Mode léger / préférence ----------------------- */

/** Mode léger : reduced motion/transparency, saveData ou appareil lent. */
export function useLightMode(): boolean {
  const [light, setLight] = useState(() => detectLight())
  useEffect(() => {
    const queries = [
      '(prefers-reduced-motion: reduce)',
      '(prefers-reduced-transparency: reduce)',
      '(prefers-reduced-data: reduce)',
    ]
    const mqls = queries.map((q) => window.matchMedia(q))
    const onChange = () => setLight(detectLight())
    for (const m of mqls) m.addEventListener('change', onChange)
    return () => mqls.forEach((m) => m.removeEventListener('change', onChange))
  }, [])
  return light
}

function detectLight(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return true
  if ((nav.deviceMemory ?? 8) <= 2) return true
  if ((nav.hardwareConcurrency ?? 8) <= 4) return true
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(prefers-reduced-transparency: reduce)').matches ||
    window.matchMedia('(prefers-reduced-data: reduce)').matches
  )
}

