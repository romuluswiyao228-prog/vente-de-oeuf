import Reveal from './Reveal'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
}

export default function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <div className="bg-sand/60 pb-12 pt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra">{eyebrow}</p>
          )}
          <h1 className="mt-2 font-display text-4xl font-semibold text-bark sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-bark-soft">{subtitle}</p>}
        </Reveal>
      </div>
    </div>
  )
}
