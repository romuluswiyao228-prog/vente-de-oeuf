import { useState } from 'react'
import Dashboard2 from './Dashboard2'
import DashboardTab from './DashboardTab'
import type { FarmData } from '../../lib/farm'

interface Props {
  farm: FarmData
  farmRefetch: () => void
  onGoFarm: (sub: string) => void
  onNavigateTab: (tab: string) => void
}

/** Tableau de bord : nouvelle version « verre dépoli » par défaut,
 *  l'ancienne reste accessible via le lien « Ancien tableau de bord ». */
export default function DashboardHome({ farm, farmRefetch, onGoFarm, onNavigateTab }: Props) {
  const [old, setOld] = useState(false)

  if (old) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOld(false)}
          className="mb-4 text-sm font-semibold text-terra-dark underline"
        >
          ← Retour au nouveau tableau de bord
        </button>
        <DashboardTab farm={farm} onNavigate={onNavigateTab} />
      </div>
    )
  }

  return (
    <Dashboard2
      farm={farm}
      farmRefetch={farmRefetch}
      onGoFarm={onGoFarm}
      onShowOld={() => setOld(true)}
    />
  )
}
