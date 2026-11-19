import { useState } from 'react'
import SmartImg from './SmartImg'

interface PhotoStripProps {
  photos: { id: string; url: string }[]
}

/** Bande de photos défilant en boucle infinie. Masquée si aucune photo n'est uploadée. */
export default function PhotoStrip({ photos }: PhotoStripProps) {
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const visible = photos.filter((p) => p.url && !failed[p.id])
  if (visible.length === 0) return null

  const doubled = [...visible, ...visible]

  return (
    <div className="marquee overflow-hidden border-y border-line bg-sand py-4">
      <div className="marquee-track marquee-track-slow">
        <div className="flex shrink-0 gap-4 pr-4">
          {doubled.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="h-24 w-32 shrink-0 overflow-hidden rounded-2xl shadow-card sm:h-28 sm:w-40"
            >
              <SmartImg
                src={p.url}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setFailed((f) => ({ ...f, [p.id]: true }))}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
