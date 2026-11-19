import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import { img } from '../lib/media'
import { Link } from 'react-router-dom'

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
          {[111, 112].map((s) => (
            <div key={s} className="overflow-hidden rounded-[2rem] shadow-card">
              <SmartImg src={img('chicks hatching', s)} seed={s} alt="Poussins à l’éclosion" className="aspect-[4/3] w-full object-cover" />
            </div>
          ))}
          <Link
            to="/annonces"
            className="btn block rounded-3xl bg-terra px-6 py-5 text-center text-sm font-semibold text-cream hover:bg-terra-dark"
          >
            Trouver des œufs fertiles →
          </Link>
        </Reveal>
      </section>
    </>
  )
}
