import { Link, useParams } from 'react-router-dom'
import Reveal from '../components/Reveal'
import SmartImg from '../components/SmartImg'
import { resourceNames, useBlogPost, useResourceLoaded } from '../lib/store'
import { useSeo } from '../lib/seo'
import Skeleton from '../components/Skeleton'

export default function BlogArticle() {
  const { slug } = useParams()
  const post = useBlogPost(slug)
  const postLoaded = useResourceLoaded(slug ? resourceNames.blogPost(slug) : 'blog-post:none')
  useSeo(post?.title, post?.excerpt)

  if (!post) {
    if (!postLoaded) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6" aria-hidden="true">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-6 h-10 w-4/5" />
          <Skeleton className="mt-8 aspect-[16/9] rounded-[2rem]" />
          <div className="mt-8 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      )
    }
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
          {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-bark sm:text-5xl">
          {post.title}
        </h1>
        {post.image_url && (
          <div className="card-zoom mt-8 overflow-hidden rounded-[2rem] shadow-card">
            <SmartImg src={post.image_url} alt={post.title} className="aspect-[16/9] w-full object-cover" />
          </div>
        )}
        <div className="mt-8 whitespace-pre-line space-y-5 leading-relaxed text-bark-soft">
          {post.content}
        </div>
      </Reveal>
    </article>
  )
}
