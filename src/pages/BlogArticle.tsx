import { Link, useParams } from 'react-router-dom'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import { articles } from '../data/catalog'

export default function BlogArticle() {
  const { slug } = useParams()
  const article = articles.find((a) => a.slug === slug)

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-bark">Article introuvable</h1>
        <Link to="/blog" className="btn mt-6 inline-block rounded-full bg-terra px-6 py-3 text-sm font-semibold text-cream">
          Retour au blog
        </Link>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Reveal>
        <Link to="/blog" className="text-sm font-semibold text-terra-dark hover:underline">
          ← Tous les articles
        </Link>
        <p className="mt-6 text-xs text-bark-soft">
          {article.date} · {article.readTime} de lecture
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-bark sm:text-5xl">
          {article.title}
        </h1>
        <div className="card-zoom mt-8 overflow-hidden rounded-[2rem] shadow-card">
          <SmartImg src={article.image} seed={article.seed} alt={article.title} className="aspect-[16/9] w-full object-cover" />
        </div>
        <div className="mt-8 space-y-5 leading-relaxed text-bark-soft">
          <p>{article.excerpt}</p>
          <p>
            Chez {article.title.split(':')[0].toLowerCase()}, chaque élevage est différent. La
            clé d’une réussite durable, c’est de commencer petit, d’observer vos oiseaux et
            d’ajuster progressivement leurs conditions de vie.
          </p>
          <p>
            Nos éleveurs partagent ici leurs retours d’expérience : dosez les conseils, testez,
            et surtout, notez ce qui fonctionne dans votre basse-cour. La communauté est là
            pour échanger.
          </p>
          <p>
            Vous préparez votre premier lot d’œufs fertiles ?{' '}
            <Link to="/incubation" className="font-semibold text-terra-dark underline">
              Consultez notre guide d’incubation
            </Link>{' '}
            ou{' '}
            <Link to="/annonces" className="font-semibold text-terra-dark underline">
              parcourez les annonces
            </Link>
            .
          </p>
        </div>
      </Reveal>
    </article>
  )
}
