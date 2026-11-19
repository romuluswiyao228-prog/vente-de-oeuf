import Reveal from './Reveal'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}

export default function SectionHeading({ eyebrow, title, subtitle, align = 'center' }: SectionHeadingProps) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-left'
  return (
    <Reveal className={`max-w-2xl ${alignCls}`}>
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-terra">{eyebrow}</p>
      )}
      <h2 className="font-display text-3xl font-semibold leading-tight text-bark sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base leading-relaxed text-bark-soft">{subtitle}</p>}
    </Reveal>
  )
}
