/**
 * Color extraction utility.
 * Uses `sharp` to decode any image (webp, png, jpg, etc.) and finds
 * the most visually prominent BRAND color — prioritizing saturation over frequency.
 *
 * Strategy: pick the pixel with the highest chroma (colorfulness),
 * which reliably finds the brand accent color even if it's rare in the image.
 *
 * Returns a hex string like "#FCDD09".
 */

import sharp from 'sharp'

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

/**
 * Returns chroma (colorfulness) of an RGB color — 0 (grey) to 255 (fully saturated).
 * Chroma = max(R,G,B) - min(R,G,B)
 */
function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b)
}

/**
 * Returns perceived lightness (0–255). Used to skip very dark or very light pixels.
 */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Extracts the dominant BRAND color from an image buffer.
 *
 * Uses a chroma-first scoring that reliably picks the accent color
 * even when it only appears on a small portion of the image (e.g. logos with
 * a black background and a yellow/colored element).
 *
 * @param buffer - Raw image file bytes (any format sharp supports: webp, png, jpg, etc.)
 * @returns Hex color string like "#FCDD09", or null if extraction fails
 */
export async function extractDominantColor(buffer: Buffer): Promise<string | null> {
  try {
    // Decode to raw RGB, 128×128 gives enough detail without being slow
    const { data, info } = await sharp(buffer)
      .resize(128, 128, { fit: 'fill' })
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // remove transparency
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels = info.width * info.height
    const ch = info.channels // 3 (RGB after raw())

    // Accumulate colors into 32-step buckets, scored by chroma × count
    const buckets = new Map<string, {
      rSum: number; gSum: number; bSum: number
      count: number; chromaSum: number
    }>()

    for (let i = 0; i < pixels; i++) {
      const offset = i * ch
      const r = data[offset]
      const g = data[offset + 1]
      const b = data[offset + 2]

      const lum = luminance(r, g, b)
      const c = chroma(r, g, b)

      // Skip near-black (lum < 30) and near-white (lum > 230) and grey (c < 20)
      if (lum < 30 || lum > 230 || c < 20) continue

      // Quantize to 32-step buckets for grouping
      const rq = Math.min(240, Math.round(r / 32) * 32)
      const gq = Math.min(240, Math.round(g / 32) * 32)
      const bq = Math.min(240, Math.round(b / 32) * 32)
      const key = `${rq},${gq},${bq}`

      const ex = buckets.get(key)
      if (ex) {
        ex.rSum += r; ex.gSum += g; ex.bSum += b
        ex.count++
        ex.chromaSum += c
      } else {
        buckets.set(key, { rSum: r, gSum: g, bSum: b, count: 1, chromaSum: c })
      }
    }

    if (buckets.size === 0) {
      console.warn('[colorExtract] No colorful pixels found — returning null')
      return null
    }

    // Score = chromaSum × log(count + 1)
    // This strongly favors saturated colors even if they appear less frequently.
    let bestScore = -1
    let bestR = 0, bestG = 0, bestB = 0

    for (const bucket of buckets.values()) {
      const score = bucket.chromaSum * Math.log(bucket.count + 1)
      if (score > bestScore) {
        bestScore = score
        // Use average of real pixel values in bucket (more accurate than quantized centroid)
        bestR = bucket.rSum / bucket.count
        bestG = bucket.gSum / bucket.count
        bestB = bucket.bSum / bucket.count
      }
    }

    return rgbToHex(bestR, bestG, bestB)
  } catch (err) {
    console.error('[colorExtract] Error extracting color:', err)
    return null
  }
}
