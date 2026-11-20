import { useEffect } from 'react'
import { useSiteTexts } from './store'

/**
 * document.title + meta description par page.
 * Le titre affiché est « {title} · {site_name} » (ou juste le nom du site).
 */
export function useSeo(title?: string, description?: string) {
  const texts = useSiteTexts()

  useEffect(() => {
    document.title = title ? `${title} · ${texts.site_name}` : texts.site_name
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description ?? texts.tagline
  }, [title, description, texts.site_name, texts.tagline])
}
