import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

export const VIDEO_INPUT_MAX_SIZE = 300 * 1024 * 1024 // 300 Mo
const OUTPUT_MAX_SIZE = 50 * 1024 * 1024 // 50 Mo
const SKIP_RECONVERT_UNDER = 10 * 1024 * 1024 // MP4 H.264 < 10 Mo : tel quel
const CRF_STEPS = [28, 32, 35]

export const AUDIO_ONLY_MESSAGE =
  'Ce fichier est un fichier audio, pas une vidéo. Choisis un fichier vidéo.'

export class ConversionCancelled extends Error {
  constructor() {
    super('Conversion annulée.')
    this.name = 'ConversionCancelled'
  }
}

export interface VideoProbe {
  /** true si le fichier contient une piste vidéo */
  hasVideo: boolean
  /** true si on a pu lire les métadonnées */
  probed: boolean
  duration: number
  width: number
  height: number
}

const AUDIO_EXT = /\.(m4a|mp3|wav|aac|ogg|oga|opus|flac|wma)$/i

/** Vrai si la sonde (ou, à défaut, l'extension) indique un fichier audio sans image. */
export function isAudioOnlyProbe(probe: VideoProbe, fileName: string): boolean {
  if (probe.probed) return !probe.hasVideo
  return AUDIO_EXT.test(fileName)
}

/** Sonde la vidéo via un élément <video> (videoWidth === 0 après loadedmetadata = audio seul). */
export function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    const done = (p: VideoProbe) => {
      URL.revokeObjectURL(url)
      resolve(p)
    }
    v.onloadedmetadata = () =>
      done({
        hasVideo: v.videoWidth > 0,
        probed: true,
        duration: Number.isFinite(v.duration) ? v.duration : 0,
        width: v.videoWidth,
        height: v.videoHeight,
      })
    v.onerror = () => done({ hasVideo: true, probed: false, duration: 0, width: 0, height: 0 })
    v.src = url
  })
}



/** MP4 H.264 de moins de 10 Mo : pas besoin de reconvertir. */
export function isLightMp4(file: File): boolean {
  return file.type === 'video/mp4' && file.size < SKIP_RECONVERT_UNDER
}

/** Formats vidéo acceptés en entrée (avant conversion). */
export function isAcceptedVideo(file: File): boolean {
  const name = file.name.toLowerCase()
  return /\.(mp4|mov|m4v|webm|avi|mkv)$/.test(name)
}

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
  'video/webm': '.webm',
  'video/x-msvideo': '.avi',
  'video/x-matroska': '.mkv',
  'video/x-ms-wmv': '.wmv',
}

function inputExt(file: File): string {
  const m = file.name.toLowerCase().match(/\.[a-z0-9]+$/)
  if (m && /\.(mp4|mov|m4v|webm|avi|mkv|wmv)$/.test(m[0])) return m[0]
  return MIME_TO_EXT[file.type] ?? '.mp4'
}

export interface PrepareOptions {
  onProgress?: (percent: number) => void
  shouldCancel?: () => boolean
}

export interface PrepareResult {
  file: File
  converted: boolean
  beforeSize: number
  afterSize: number
}

/**
 * Convertit la vidéo en MP4 H.264 720p sans son via ffmpeg.wasm
 * (chargé à la demande, version mono-thread). Renvoie le fichier prêt à envoyer.
 */
export async function prepareVideoForUpload(
  file: File,
  opts: PrepareOptions = {},
): Promise<PrepareResult> {
  if (isLightMp4(file)) {
    return { file, converted: false, beforeSize: file.size, afterSize: file.size }
  }

  // Chargement à la demande : rien de tout cela n'est importé sur le site public.
  const [{ FFmpeg }, { fetchFile }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ])

  const ffmpeg = new FFmpeg()
  let cancelled = false
  ffmpeg.on('progress', ({ progress }) => {
    if (opts.shouldCancel?.() && !cancelled) {
      cancelled = true
      Promise.resolve(ffmpeg.terminate()).catch(() => {})
      return
    }
    if (cancelled) return
    const pct = Math.min(99, Math.max(0, Math.round((progress ?? 0) * 100)))
    opts.onProgress?.(pct)
  })

  const inName = `input${inputExt(file)}`
  const outName = 'output.mp4'
  const baseArgs = (crf: number) => [
    '-y',
    '-i',
    inName,
    '-vf',
    "scale=-2:'min(720,ih)'",
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(crf),
    '-pix_fmt',
    'yuv420p',
    '-an',
    '-movflags',
    '+faststart',
    outName,
  ]

  try {
    await ffmpeg.load({ coreURL, wasmURL })
    await ffmpeg.writeFile(inName, await fetchFile(file))

    let data: Uint8Array | string = new Uint8Array()
    for (const crf of CRF_STEPS) {
      if (cancelled || opts.shouldCancel?.()) throw new ConversionCancelled()
      await ffmpeg.exec(baseArgs(crf))
      if (cancelled) throw new ConversionCancelled()
      data = await ffmpeg.readFile(outName)
      const size = typeof data === 'string' ? data.length : data.byteLength
      if (size <= OUTPUT_MAX_SIZE) break
      if (crf === CRF_STEPS[CRF_STEPS.length - 1]) break
    }

    opts.onProgress?.(100)
    const bytes =
      typeof data === 'string' ? new TextEncoder().encode(data) : data
    const out = new File([bytes as BlobPart], file.name.replace(/\.[^.]+$/, '') + '.mp4', {
      type: 'video/mp4',
    })
    return { file: out, converted: true, beforeSize: file.size, afterSize: out.size }
  } catch (err) {
    if (cancelled || err instanceof ConversionCancelled) throw new ConversionCancelled()
    throw err
  } finally {
    try {
      await ffmpeg.terminate()
    } catch {
      /* déjà terminé */
    }
  }
}

export function formatMo(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} Mo`
}
