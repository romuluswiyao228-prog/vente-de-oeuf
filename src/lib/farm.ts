import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type {
  BatchPrice,
  CashMovement,
  CashMovementKind,
  ClientPayment,
  ExpenseCategoryItem,
  FarmClient,
  FarmSale,
  FarmSaleLine,
  EggMovement,
  EggMovementKind,
  FarmAlert,
  FarmBatch,
  FarmBatchEvent,
  FarmEvent,
  FarmExpense,
  FarmSupply,
  FarmTask,
  Incubation,
  SupplyCategory,
  SupplyMovement,
} from './types'

/* --------------------------------- Dates --------------------------------- */

/** Date du jour au format YYYY-MM-DD dans le fuseau de Lomé (UTC, pas d'heure d'été). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function fmtDateFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function daysUntil(iso: string): number {
  const a = new Date(`${todayISO()}T00:00:00Z`).getTime()
  const b = new Date(`${iso}T00:00:00Z`).getTime()
  return Math.round((b - a) / 86400000)
}

/* --------------------------------- Données -------------------------------- */

export interface FarmData {
  batches: FarmBatch[]
  batchEvents: FarmBatchEvent[]
  eggMovements: EggMovement[]
  incubations: Incubation[]
  supplies: FarmSupply[]
  supplyMovements: SupplyMovement[]
  expenses: FarmExpense[]
  tasks: FarmTask[]
  batchPrices: BatchPrice[]
  farmEvents: FarmEvent[]
  farmClients: FarmClient[]
  sales: FarmSale[]
  saleLines: FarmSaleLine[]
  clientPayments: ClientPayment[]
  expenseCategories: ExpenseCategoryItem[]
  cashMovements: CashMovement[]
  eggsPerTray: number
  eggReserve: number
}

const EMPTY: FarmData = {
  batches: [],
  batchEvents: [],
  eggMovements: [],
  incubations: [],
  supplies: [],
  supplyMovements: [],
  expenses: [],
  tasks: [],
  batchPrices: [],
  farmEvents: [],
  farmClients: [],
  sales: [],
  saleLines: [],
  clientPayments: [],
  expenseCategories: [],
  cashMovements: [],
  eggsPerTray: 30,
  eggReserve: 0,
}

function useFarmQuery<T>(fetcher: () => Promise<T>, deps: unknown[]): { data: T | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await fetcher()
        if (!cancelled) setData(result)
      } catch (err) {
        console.error('Erreur chargement ferme :', err)
        if (!cancelled) setData(null)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return { data, refetch }
}

export function useFarmData(): { data: FarmData; loading: boolean; refetch: () => void } {
  const [loading, setLoading] = useState(true)
  const { data, refetch } = useFarmQuery<FarmData>(async () => {
    if (!supabase) return EMPTY
    const [
      batches,
      batchEvents,
      eggMovements,
      incubations,
      supplies,
      supplyMovements,
      expenses,
      tasks,
      batchPrices,
      farmEvents,
      farmClients,
      sales,
      saleLines,
      clientPayments,
      expenseCategories,
      cashMovements,
      trayText,
    ] = await Promise.all([
      supabase.from('farm_batches_view').select('*').order('created_at', { ascending: false }),
      supabase.from('farm_batch_events').select('*').order('date', { ascending: false }),
      supabase.from('egg_movements').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('incubations').select('*').order('started_on', { ascending: false }),
      supabase.from('farm_supplies_view').select('*').order('name'),
      supabase.from('supply_movements').select('*').order('date', { ascending: false }),
      supabase.from('farm_expenses').select('*').order('date', { ascending: false }),
      supabase.from('farm_tasks').select('*').order('due_on'),
      supabase.from('batch_prices').select('*').order('effective_from', { ascending: false }),
      supabase.from('farm_events').select('*').order('date', { ascending: false }),
      supabase.from('farm_clients').select('*').order('name'),
      supabase.from('farm_sales').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('farm_sale_lines').select('*'),
      supabase.from('client_payments').select('*').order('date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('sort_order'),
      supabase.from('cash_movements').select('*').order('date', { ascending: false }),
      supabase.from('site_texts').select('value').eq('key', 'eggs_per_tray').maybeSingle(),
    ])
    const eggsPerTray = Math.max(1, parseInt(trayText.data?.value ?? '30', 10) || 30)
    const eggReserve = (eggMovements.data ?? []).reduce((n, m) => n + (m.qty_eggs ?? 0), 0)
    return {
      batches: (batches.data ?? []) as FarmBatch[],
      batchEvents: (batchEvents.data ?? []) as FarmBatchEvent[],
      eggMovements: (eggMovements.data ?? []) as EggMovement[],
      incubations: (incubations.data ?? []) as Incubation[],
      supplies: (supplies.data ?? []) as FarmSupply[],
      supplyMovements: (supplyMovements.data ?? []) as SupplyMovement[],
      expenses: (expenses.data ?? []) as FarmExpense[],
      tasks: (tasks.data ?? []) as FarmTask[],
      batchPrices: (batchPrices.data ?? []) as BatchPrice[],
      farmEvents: (farmEvents.data ?? []) as FarmEvent[],
      farmClients: (farmClients.data ?? []) as FarmClient[],
      sales: (sales.data ?? []) as FarmSale[],
      saleLines: (saleLines.data ?? []) as FarmSaleLine[],
      clientPayments: (clientPayments.data ?? []) as ClientPayment[],
      expenseCategories: (expenseCategories.data ?? []) as ExpenseCategoryItem[],
      cashMovements: (cashMovements.data ?? []) as CashMovement[],
      eggsPerTray,
      eggReserve,
    }
  }, [])

  useEffect(() => {
    if (data !== null) setLoading(false)
  }, [data])

  return { data: data ?? EMPTY, loading, refetch }
}

/** Alertes calculées (aucune table) — partagées entre la bannière Ferme et la pastille du menu. */
export function computeFarmAlerts(d: FarmData): FarmAlert[] {
  const alerts: FarmAlert[] = []
  const today = todayISO()
  const inDays = (n: number) => {
    const t = new Date(`${today}T00:00:00Z`)
    t.setUTCDate(t.getUTCDate() + n)
    return t.toISOString().slice(0, 10)
  }
  const soon = inDays(14)
  const hatchSoon = inDays(3)

  for (const s of d.supplies) {
    const stock = s.stock ?? 0
    if (s.alert_threshold != null && stock <= s.alert_threshold) {
      alerts.push({ id: `supply-${s.id}`, level: 'warn', text: `Stock bas : ${s.name} (${stock} ${s.unit})` })
    }
    if (s.expiry_date && s.expiry_date <= soon) {
      alerts.push({
        id: `expiry-${s.id}`,
        level: 'warn',
        text: s.expiry_date < today
          ? `${s.name} : périmé depuis le ${fmtDateFr(s.expiry_date)}`
          : `${s.name} : périme le ${fmtDateFr(s.expiry_date)}`,
      })
    }
  }

  for (const inc of d.incubations) {
    if (inc.status === 'en_cours' && inc.expected_hatch_on <= hatchSoon) {
      const left = daysUntil(inc.expected_hatch_on)
      alerts.push({
        id: `hatch-${inc.id}`,
        level: 'warn',
        text: `Éclosion ${left < 0 ? `en retard de ${-left} j` : left === 0 ? 'prévue aujourd’hui' : `dans ${left} j`} : ${inc.eggs_set} œufs`,
      })
    }
  }

  for (const t of d.tasks) {
    if (!t.done && t.due_on <= today) {
      alerts.push({
        id: `task-${t.id}`,
        level: 'warn',
        text: t.due_on < today ? `Rappel en retard : ${t.title}` : `Rappel pour aujourd’hui : ${t.title}`,
      })
    }
  }

  const traysLeft = Math.floor(d.eggReserve / d.eggsPerTray)
  if (traysLeft > 2) {
    alerts.push({
      id: 'reserve',
      level: 'info',
      text: `Réserve d'œufs : ${d.eggReserve} œufs (${traysLeft} plateaux + ${d.eggReserve % d.eggsPerTray}) non transférés`,
    })
  }

  return alerts
}

/** Pastille du menu : nombre d'alertes « warn » (les info ne comptent pas). */
export function farmAlertCount(d: FarmData | null): number {
  if (!d) return 0
  return computeFarmAlerts(d).filter((a) => a.level === 'warn').length
}

/* -------------------------------- Mutations ------------------------------- */

async function must<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}

export async function addEggMovements(
  entries: { kind: EggMovementKind; qty_eggs: number; batch_id?: string | null; note?: string }[],
  date: string,
) {
  if (!supabase) throw new Error('Supabase non configuré')
  await must(
    supabase.from('egg_movements').insert(
      entries.map((e) => ({
        date,
        kind: e.kind,
        qty_eggs: e.qty_eggs,
        batch_id: e.batch_id ?? null,
        note: e.note ?? '',
      })),
    ),
  )
}

/** Saisie atomique de la production d'une bande (RPC SQL). */
export async function recordProduction(
  batchId: string,
  date: string,
  plateaux: number,
  oeufs: number,
  casses: number,
) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc('farm_record_production', {
    p_date: date,
    p_batch_id: batchId,
    p_plateaux: plateaux,
    p_oeufs: oeufs,
    p_casses: casses,
  })
  if (error) throw new Error(error.message)
  return data as { sains: number; casses: number; production: number }
}

/** Prix en vigueur d'une bande pour un canal à une date donnée. */
export function priceAt(prices: BatchPrice[], batchId: string, channel: string, date: string): BatchPrice | null {
  let best: BatchPrice | null = null
  for (const p of prices) {
    if (p.batch_id !== batchId || p.channel !== channel) continue
    if (p.effective_from > date) continue
    if (!best || p.effective_from > best.effective_from) best = p
  }
  return best
}

export async function saveBatchPrice(batchId: string, channel: string, priceFcfa: number, effectiveFrom: string, note: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  await must(
    supabase.from('batch_prices').insert({
      batch_id: batchId,
      channel,
      price_fcfa: priceFcfa,
      effective_from: effectiveFrom,
      note,
    }),
  )
}

export async function deleteBatchPrice(id: string) {
  if (!supabase) return
  await must(supabase.from('batch_prices').delete().eq('id', id))
}

/** Stock d'une bande en œufs sains = somme de tous ses mouvements. */
export function batchStockEggs(movements: EggMovement[], batchId: string): number {
  return movements
    .filter((m) => m.batch_id === batchId)
    .reduce((n, m) => n + (m.qty_eggs ?? 0), 0)
}

/** « 46P22 » : plateaux + œufs détachés. */
export function fmtPlateaux(eggs: number, tray: number): string {
  const t = Math.floor(eggs / tray)
  const r = eggs % tray
  return r === 0 ? `${t}P` : `${t}P${r}`
}

export async function addFarmEvent(date: string, batchId: string | null, title: string, note: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  await must(supabase.from('farm_events').insert({ date, batch_id: batchId, title, note }))
}

export async function deleteFarmEvent(id: string) {
  if (!supabase) return
  await must(supabase.from('farm_events').delete().eq('id', id))
}

/** Supprime les mouvements ponte/casse d'une bande à une date (saisie production). */
export async function deleteProductionMovements(batchId: string, date: string) {
  if (!supabase) return
  const { error } = await supabase
    .from('egg_movements')
    .delete()
    .eq('batch_id', batchId)
    .eq('date', date)
    .in('kind', ['ponte', 'casse'])
  if (error) throw new Error(error.message)
}

export async function deleteEggMovement(id: string) {
  if (!supabase) return
  await must(supabase.from('egg_movements').delete().eq('id', id))
}

export async function transferEggsToShop(productId: string, eggs: number, date: string, note: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc('farm_transfer_eggs', {
    p_product_id: productId,
    p_eggs: eggs,
    p_date: date,
    p_note: note,
  })
  if (error) throw new Error(error.message)
  return data as { trays: number; eggs: number }
}

export async function startIncubation(batchId: string | null, startedOn: string, eggsSet: number, days: number, note: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc('farm_start_incubation', {
    p_batch_id: batchId,
    p_started_on: startedOn,
    p_eggs_set: eggsSet,
    p_days: days,
    p_note: note,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function finishIncubation(id: string, hatchedCount: number, createBatch: boolean, batchName: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc('farm_finish_incubation', {
    p_id: id,
    p_hatched_count: hatchedCount,
    p_create_batch: createBatch,
    p_batch_name: batchName,
  })
  if (error) throw new Error(error.message)
  return data as { incubation_id: string; batch_id: string | null; hatched_count: number }
}

export async function saveBatch(b: Partial<FarmBatch>) {
  if (!supabase) throw new Error('Supabase non configuré')
  if (b.id) {
    await must(supabase.from('farm_batches').update(b).eq('id', b.id))
    return b.id
  }
  const { data, error } = await supabase
    .from('farm_batches')
    .insert({
      name: '',
      species: '',
      breed: '',
      kind: 'autre',
      arrived_on: null,
      initial_count: 0,
      status: 'actif',
      note: '',
      ...b,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function addBatchEvent(batchId: string, date: string, type: FarmBatchEvent['type'], qty: number, note: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  await must(supabase.from('farm_batch_events').insert({ batch_id: batchId, date, type, qty, note }))
}

export async function deleteBatchEvent(id: string) {
  if (!supabase) return
  await must(supabase.from('farm_batch_events').delete().eq('id', id))
}

export async function saveSupply(s: Partial<FarmSupply>) {
  if (!supabase) throw new Error('Supabase non configuré')
  if (s.id) {
    await must(
      supabase
        .from('farm_supplies')
        .update({
          name: s.name,
          category: s.category,
          unit: s.unit,
          alert_threshold: s.alert_threshold,
          expiry_date: s.expiry_date,
          note: s.note,
        })
        .eq('id', s.id),
    )
    return s.id
  }
  const { data, error } = await supabase
    .from('farm_supplies')
    .insert({
      name: '',
      category: 'aliment',
      unit: 'unité',
      alert_threshold: null,
      expiry_date: null,
      note: '',
      ...s,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function deleteSupply(id: string) {
  if (!supabase) return
  await must(supabase.from('farm_supplies').delete().eq('id', id))
}

/** Entrée (qty>0) ou sortie (qty<0) de stock + mouvement ; option dépense associée. */
export async function addSupplyMovement(
  supplyId: string,
  date: string,
  qty: number,
  note: string,
  unitCost?: number | null,
  createExpense?: { category: string; amount: number } | null,
) {
  if (!supabase) throw new Error('Supabase non configuré')
  await must(
    supabase.from('supply_movements').insert({
      supply_id: supplyId,
      date,
      qty,
      unit_cost: unitCost ?? null,
      note,
    }),
  )
  if (createExpense && qty > 0) {
    await must(
      supabase.from('farm_expenses').insert({
        date,
        category: createExpense.category,
        amount: createExpense.amount,
        note: `Achat : ${note || 'approvisionnement'}`,
        supply_id: supplyId,
      }),
    )
  }
}

export async function deleteSupplyMovement(id: string) {
  if (!supabase) return
  await must(supabase.from('supply_movements').delete().eq('id', id))
}

export async function addExpense(
  date: string,
  category: string,
  amount: number,
  note: string,
  batchId?: string | null,
  supplyId?: string | null,
) {
  if (!supabase) throw new Error('Supabase non configuré')
  await must(
    supabase.from('farm_expenses').insert({
      date,
      category,
      amount,
      note,
      batch_id: batchId ?? null,
      supply_id: supplyId ?? null,
    }),
  )
}

export async function deleteExpense(id: string) {
  if (!supabase) return
  await must(supabase.from('farm_expenses').delete().eq('id', id))
}

/* ------------------------------ Clients / Ventes ------------------------- */

export interface SaleLineInput {
  batch_id: string
  plateaux: number
  oeufs: number
  unit_price: number
}

/** Œufs vendus sur une ligne : plateaux × œufs/plateau + détachés. */
export function saleLineEggs(l: { plateaux: number; oeufs: number }, tray: number): number {
  return l.plateaux * tray + l.oeufs
}

/** Montant d'une ligne : même calcul que farm_line_amount côté SQL. */
export function saleLineAmount(l: SaleLineInput, tray: number): number {
  const base = l.plateaux * l.unit_price
  const loose = l.oeufs > 0 && tray > 0 ? Math.ceil((l.unit_price * l.oeufs) / tray) : 0
  return base + loose
}

/** Statut calculé d'une vente : Payée / Partielle / À payer. */
export function saleStatus(s: FarmSale): 'payee' | 'partielle' | 'a_payer' {
  if (s.paid_amount >= s.total_fcfa && s.total_fcfa > 0) return 'payee'
  if (s.paid_amount > 0) return 'partielle'
  return 'a_payer'
}

/** Statistiques d'un client : total acheté, reste à payer, dernière vente. */
export function clientStats(clientId: string, sales: FarmSale[]): {
  total: number
  reste: number
  dernier: string | null
} {
  let total = 0
  let reste = 0
  let dernier: string | null = null
  for (const s of sales) {
    if (s.client_id !== clientId) continue
    total += s.total_fcfa
    reste += Math.max(0, s.total_fcfa - s.paid_amount)
    if (!dernier || s.date > dernier) dernier = s.date
  }
  return { total, reste, dernier }
}

export async function saveClient(c: Partial<FarmClient>) {
  if (!supabase) throw new Error('Supabase non configuré')
  if (c.id) {
    await must(
      supabase
        .from('farm_clients')
        .update({
          name: c.name,
          phone: c.phone,
          type: c.type,
          note: c.note,
          active: c.active,
        })
        .eq('id', c.id),
    )
    return c.id
  }
  const { data, error } = await supabase
    .from('farm_clients')
    .insert({
      name: '',
      phone: '',
      type: 'particulier',
      note: '',
      active: true,
      ...c,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function createSale(
  date: string,
  clientId: string | null,
  channel: string,
  paidAmount: number,
  note: string,
  lines: SaleLineInput[],
  force = false,
) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc('farm_create_sale', {
    p_date: date,
    p_client_id: clientId,
    p_channel: channel,
    p_paid_amount: paidAmount,
    p_note: note,
    p_lines: lines,
    p_force: force,
  })
  if (error) throw new Error(error.message)
  return data as { sale_id: string; total_fcfa: number }
}

export async function updateSale(
  saleId: string,
  date: string,
  clientId: string | null,
  channel: string,
  paidAmount: number,
  note: string,
  lines: SaleLineInput[],
  force = false,
) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc('farm_update_sale', {
    p_sale_id: saleId,
    p_date: date,
    p_client_id: clientId,
    p_channel: channel,
    p_paid_amount: paidAmount,
    p_note: note,
    p_lines: lines,
    p_force: force,
  })
  if (error) throw new Error(error.message)
  return data as { sale_id: string; total_fcfa: number }
}

export async function deleteSale(saleId: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { error } = await supabase.rpc('farm_delete_sale', { p_sale_id: saleId })
  if (error) throw new Error(error.message)
}

export async function receivePayment(
  clientId: string,
  amount: number,
  date: string,
  method: string,
  note: string,
) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.rpc('farm_receive_payment', {
    p_client_id: clientId,
    p_amount: amount,
    p_date: date,
    p_method: method,
    p_note: note,
  })
  if (error) throw new Error(error.message)
  return data as { payment_id: string; amount: number; allocated: number; unallocated: number }
}

export async function addTask(title: string, dueOn: string, note: string) {
  if (!supabase) throw new Error('Supabase non configuré')
  await must(supabase.from('farm_tasks').insert({ title, due_on: dueOn, note }))
}

export async function toggleTask(id: string, done: boolean) {
  if (!supabase) return
  await must(supabase.from('farm_tasks').update({ done }).eq('id', id))
}

export async function deleteTask(id: string) {
  if (!supabase) return
  await must(supabase.from('farm_tasks').delete().eq('id', id))
}

/* ------------------------- Catégories de dépenses ------------------------ */

export async function saveExpenseCategory(input: {
  id?: string
  name: string
  active?: boolean
  sort_order?: number
}) {
  if (!supabase) throw new Error('Supabase non configuré')
  const name = input.name.trim()
  if (!name) throw new Error('Le nom est requis')
  if (input.id) {
    const patch: { name?: string; active?: boolean } = {}
    if (input.name !== undefined) patch.name = name
    if (input.active !== undefined) patch.active = input.active
    await must(supabase.from('expense_categories').update(patch).eq('id', input.id))
  } else {
    await must(
      supabase
        .from('expense_categories')
        .insert({ name, active: true, sort_order: input.sort_order ?? 0 }),
    )
  }
}

export async function deleteExpenseCategory(id: string) {
  if (!supabase) return
  await must(supabase.from('expense_categories').delete().eq('id', id))
}

/* ------------------------------ Mouvements de caisse ----------------------------- */

export async function addCashMovement(input: {
  date: string
  kind: CashMovementKind
  amount: number
  note: string
}) {
  if (!supabase) throw new Error('Supabase non configuré')
  await must(
    supabase.from('cash_movements').insert({
      date: input.date,
      kind: input.kind,
      amount: input.amount,
      note: input.note.trim(),
    }),
  )
}

export async function deleteCashMovement(id: string) {
  if (!supabase) return
  await must(supabase.from('cash_movements').delete().eq('id', id))
}

/* ------------------------------ Trésorerie ----------------------------- */

export interface TreasuryResult {
  ventesEncaissees: number
  apports: number
  autresEntrees: number
  remboursements: number
  retraits: number
  autresSorties: number
  depenses: number
  solde: number
  detailDepenses: { category: string; amount: number }[]
}

/** Trésorerie calculée sur [from, to] : ventes encaissées + apports/entrées
 *  − dépenses − remboursements/retraits/sorties. */
export function computeTreasury(data: FarmData, from: string, to: string): TreasuryResult {
  const inPeriod = (d: string) => d >= from && d <= to

  const ventesEncaissees =
    data.clientPayments.filter((p) => inPeriod(p.date)).reduce((n, p) => n + p.amount, 0) +
    data.sales.filter((s) => inPeriod(s.date)).reduce((n, s) => n + (s.entry_paid ?? 0), 0)

  let apports = 0
  let remboursements = 0
  let retraits = 0
  let autresEntrees = 0
  let autresSorties = 0
  for (const m of data.cashMovements) {
    if (!inPeriod(m.date)) continue
    if (m.kind === 'apport_promoteur') apports += m.amount
    else if (m.kind === 'remboursement') remboursements += m.amount
    else if (m.kind === 'retrait') retraits += m.amount
    else if (m.kind === 'autre_entree') autresEntrees += m.amount
    else autresSorties += m.amount
  }

  const periodExpenses = data.expenses.filter((e) => inPeriod(e.date))
  const depenses = periodExpenses.reduce((n, e) => n + e.amount, 0)
  const byCat = new Map<string, number>()
  for (const e of periodExpenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount)
  const detailDepenses = [...byCat.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const solde =
    ventesEncaissees + apports + autresEntrees - remboursements - retraits - autresSorties - depenses

  return {
    ventesEncaissees,
    apports,
    autresEntrees,
    remboursements,
    retraits,
    autresSorties,
    depenses,
    solde,
    detailDepenses,
  }
}

/** Apports du promoteur : total versés et remboursés, solde. */
export function computeApports(data: FarmData, from: string, to: string) {
  const t = computeTreasury(data, from, to)
  return { apports: t.apports, remboursements: t.remboursements, solde: t.apports - t.remboursements }
}

/* ----------------------------------- CSV --------------------------------- */

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map((r) => r.map(esc).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export { type SupplyCategory }
