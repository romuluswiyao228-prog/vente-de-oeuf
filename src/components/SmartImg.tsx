import { useState, type ImgHTMLAttributes } from 'react'

interface SmartImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** URL réelle issue de Supabase Storage. Si absente ou en erreur : fond uni terracotta. */
  src?: string | null
}

function EggPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-terra-soft">
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-terra/60" fill="currentColor" aria-hidden="true">
        <path d="M32 8c8 0 15 11.5 15 21.5S40 52 32 52s-15-9.5-15-22.5S24 8 32 8z" />
      </svg>
    </div>
  )
}

export default function SmartImg({ src, alt = '', className = '', ...props }: SmartImgProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={className} role="img" aria-label={alt || 'Image'}>
        <EggPlaceholder />
      </div>
    )
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
