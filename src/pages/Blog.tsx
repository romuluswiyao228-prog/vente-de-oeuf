import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import { useBlogPosts } from '../lib/store'
import { useSeo } from '../lib/seo'

export default function Blog() {
  useSeo('Blog')
  const posts = useBlogPosts()

  return (
    <>
      <PageHeader
        eyebrow="Le journal"
        title="Blog"
        subtitle="Conseils d’élevage, guides pratiques et retours d’expérience."
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {posts.length === 0 ? (
          <p className="rounded-3xl bg-white p-10 text-center text-bark-soft shadow-card">
            Aucun article pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {posts.map((a, i) => (
              <Reveal key={a.id} delay={i * 100}>
                <Link
                  to={`/blog/${a.slug}`}
                  className="card-lift group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card"
                >
                  <div className="card-zoom aspect-[16/10] overflow-hidden bg-sand">
                    <SmartImg src={a.image_url} alt={a.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-xs text-bark-soft">
                      {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-bark group-hover:text-terra-dark">
                      {a.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-bark-soft">{a.excerpt}</p>
                    <span className="mt-4 text-sm font-semibold text-terra-dark">Lire l’article →</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
