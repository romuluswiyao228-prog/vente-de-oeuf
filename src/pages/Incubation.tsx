import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { Link } from 'react-router-dom'
import { useSeo } from '../lib/seo'

const steps = [
  {
    n: '01',
    t: 'Recevez vos fertiles',
    d: 'Œufs marqués à la date de ponte, calibrés et protégés. Conservez-les pointus vers le bas, à température stable.',
  },
  {
    n: '02',
    t: 'Laissez reposer 24 h',
    d: 'Avant l’incubation, laissez vos œufs se stabiliser dans un endroit frais et sans secousses.',
  },
  {
    n: '03',
    t: 'Incubez ou confiez à une couveuse',
    d: 'Couveuse à 37,5 °C et 55 % d’hygrométrie, ou poule couveuse attentive. Retournez les œufs 3 à 5 fois par jour.',
  },
  {
    n: '04',
    t: 'Attendez le jour J',
    d: '21 jours pour la plupart des races. Augmentez l’hygrométrie à 65 % les 3 derniers jours pour faciliter l’éclosion.',
  },
  {
    n: '05',
    t: 'Accueillez vos poussins',
    d: 'Chaleur, eau et aliment démarrage : tout doit être prêt avant même l’éclosion.',
  },
]

export default function Incubation() {
  useSeo('Incubation')
  return (
    <>
      <PageHeader
        eyebrow="Guide complet"
        title="Incubation des œufs fertiles"
        subtitle="Tout ce qu’il faut savoir pour maximiser votre taux d’éclosion, avec ou sans couveuse électrique."
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
        <Reveal>
          <ol className="space-y-6">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-5 rounded-3xl bg-white p-6 shadow-card">
                <span className="font-display text-3xl font-semibold text-terra-soft">{s.n}</span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-bark">{s.t}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-bark-soft">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={150} className="space-y-4">
          <div className="flex aspect-[4/3] items-center justify-center rounded-[2rem] bg-terra-soft shadow-card">
            <svg viewBox="0 0 64 64" className="h-20 w-20 text-terra/50" fill="currentColor" aria-hidden="true">
              <path d="M32 8c8 0 15 11.5 15 21.5S40 52 32 52s-15-9.5-15-22.5S24 8 32 8z" />
            </svg>
          </div>
          <Link
            to="/annonces"
            className="btn block rounded-3xl bg-terra px-6 py-5 text-center text-sm font-semibold text-cream hover:bg-terra-dark"
          >
            Voir les œufs fertiles →
          </Link>
        </Reveal>
      </section>
    </>
  )
}
