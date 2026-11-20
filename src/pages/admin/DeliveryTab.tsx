import { useState, type FormEvent } from 'react'
import { deleteZone, formatPrice, savePayment, saveZone } from '../../lib/store'
import type { DeliveryZone, PaymentMethod } from '../../lib/types'

const inputCls =
  'rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-bark focus:border-terra focus:outline-none'

interface Props {
  zones: DeliveryZone[]
  payments: PaymentMethod[]
  refetch: () => void
}

export default function DeliveryTab({ zones, payments, refetch }: Props) {
  const [newZone, setNewZone] = useState({ name: '', fee_fcfa: 0 })

  const addZone = async (e: FormEvent) => {
    e.preventDefault()
    if (!newZone.name.trim()) return
    await saveZone({ name: newZone.name.trim(), fee_fcfa: Number(newZone.fee_fcfa) || 0 })
    setNewZone({ name: '', fee_fcfa: 0 })
    refetch()
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Zones de livraison */}
      <div className="rounded-[2rem] bg-white p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-bark">Zones de livraison</h2>
        <ul className="mt-4 space-y-3">
          {zones.length === 0 && <li className="text-sm text-bark-soft">Aucune zone configurée.</li>}
          {zones.map((z) => (
            <li key={z.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-cream px-4 py-3">
              <input
                defaultValue={z.name}
                onBlur={async (e) => {
                  if (e.target.value !== z.name) {
                    await saveZone({ id: z.id, name: e.target.value })
                    refetch()
                  }
                }}
                className={`${inputCls} flex-1 min-w-[120px]`}
              />
              <input
                type="number"
                min={0}
                defaultValue={z.fee_fcfa}
                onBlur={async (e) => {
                  const v = Number(e.target.value) || 0
                  if (v !== z.fee_fcfa) {
                    await saveZone({ id: z.id, fee_fcfa: v })
                    refetch()
                  }
                }}
                className={`${inputCls} w-32`}
                aria-label="Frais FCFA"
              />
              <label className="flex items-center gap-2 text-sm text-bark">
                <input
                  type="checkbox"
                  checked={z.active}
                  onChange={async (e) => {
                    await saveZone({ id: z.id, active: e.target.checked })
                    refetch()
                  }}
                  className="h-4 w-4 accent-terra"
                />
                Active
              </label>
              <button
                onClick={async () => {
                  if (confirm('Supprimer cette zone ?')) {
                    await deleteZone(z.id)
                    refetch()
                  }
                }}
                className="btn text-sm font-semibold text-terra-dark hover:underline"
              >
                Suppr.
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addZone} className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
          <input
            required
            placeholder="Nom de la zone (ex : Lomé)"
            value={newZone.name}
            onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
            className={`${inputCls} flex-1 min-w-[160px]`}
          />
          <input
            type="number"
            min={0}
            placeholder="Frais (FCFA, 0 = gratuit)"
            value={newZone.fee_fcfa || ''}
            onChange={(e) => setNewZone({ ...newZone, fee_fcfa: Number(e.target.value) })}
            className={`${inputCls} w-44`}
          />
          <button type="submit" className="btn rounded-full bg-terra px-5 py-2.5 text-sm font-semibold text-cream hover:bg-terra-dark">
            Ajouter
          </button>
        </form>
      </div>

      {/* Moyens de paiement */}
      <div className="rounded-[2rem] bg-white p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-bark">Moyens de paiement</h2>
        <ul className="mt-4 space-y-3">
          {payments.map((p) => (
            <li key={p.id} className="rounded-2xl bg-cream px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-bark">{p.label}</span>
                <label className="flex items-center gap-2 text-sm text-bark">
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={async (e) => {
                      await savePayment({ id: p.id, active: e.target.checked })
                      refetch()
                    }}
                    className="h-4 w-4 accent-terra"
                  />
                  Actif
                </label>
              </div>
              <input
                defaultValue={p.details}
                placeholder="Détails affichés au client"
                onBlur={async (e) => {
                  if (e.target.value !== p.details) {
                    await savePayment({ id: p.id, details: e.target.value })
                    refetch()
                  }
                }}
                className={`${inputCls} mt-2 w-full`}
              />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-bark-soft">
          Astuce : les montants s’affichent en FCFA via {formatPrice(5000)}.
        </p>
      </div>
    </div>
  )
}
