import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { faqs } from '../data/catalog'

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <>
      <PageHeader
        eyebrow="Questions fréquentes"
        title="FAQ"
        subtitle="Tout ce qu’il faut savoir avant de commander vos premiers œufs fécondés."
      />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <div className="overflow-hidden rounded-3xl bg-white shadow-card">
                <button
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  <span className="font-display text-lg font-semibold text-bark">{f.q}</span>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-terra-soft text-terra-dark transition-transform duration-300 ${
                      open === i ? 'rotate-45' : ''
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
                {open === i && (
                  <p className="px-6 pb-6 text-sm leading-relaxed text-bark-soft">{f.a}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}
