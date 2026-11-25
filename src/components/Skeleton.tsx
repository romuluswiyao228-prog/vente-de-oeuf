/** Bloc squelette générique (pulse doux) en attendant les données. */
export default function Skeleton({ className = '' }: { className?: string }) {
  const bg = /\bbg-/.test(className) ? '' : 'bg-sand'
  return <div className={`animate-pulse rounded-2xl ${bg} ${className}`} aria-hidden="true" />
}

/** Squelette aux dimensions d'une ProductCard (image 4:3 + lignes de texte). */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-card" aria-hidden="true">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

/** Squelette de carte article de blog (image 16:10 + texte). */
export function BlogCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card" aria-hidden="true">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
