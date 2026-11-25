import { supabase } from './supabase'

export type DashboardMetric = 'ventes' | 'commandes' | 'ponte' | 'depenses' | 'benefice'
export type DashboardPeriod = '7j' | '30j' | '12m'

export interface SeriesPoint {
  label: string
  valeur: number
}

export interface DashboardSummary {
  ventes_jour: number
  commandes_jour: number
  stock_boutique_trays: number
  reserve_oeufs: number
  eggs_per_tray: number
  benefice_mois: number
  ventes_mois: number
  depenses_mois: number
  /** null si la colonne payment_status n'existe pas encore */
  a_encaisser: number | null
}

export interface TopProduct {
  name: string
  quantite: number
  montant: number
}

export interface ExpenseCategoryTotal {
  categorie: string
  montant: number
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export function fetchSummary(): Promise<DashboardSummary> {
  return rpc<DashboardSummary>('dashboard_summary')
}

export function fetchSeries(metric: DashboardMetric, period: DashboardPeriod, offset: number): Promise<SeriesPoint[]> {
  return rpc<SeriesPoint[]>('dashboard_series', { p_metric: metric, p_period: period, p_offset: offset })
}

export function fetchTopProducts(period: DashboardPeriod): Promise<TopProduct[]> {
  return rpc<TopProduct[]>('dashboard_top_products', { p_period: period })
}

export function fetchExpensesByCategory(period: DashboardPeriod): Promise<ExpenseCategoryTotal[]> {
  return rpc<ExpenseCategoryTotal[]>('dashboard_expenses_by_category', { p_period: period })
}
