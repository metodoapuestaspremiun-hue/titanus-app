/**
 * BunnyCDN Storage Client
 * Handles uploading files to BunnyCDN storage and returns public CDN URLs.
 *
 * Storage Zone: mvps
 * Pull Zone: https://mvps.b-cdn.net
 */

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'mvps'
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY || ''
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com'
const BUNNY_PULLZONE_URL = process.env.BUNNY_PULLZONE_URL || 'https://mvps.b-cdn.net'

export interface BunnyUploadResult {
  cdnUrl: string
  storagePath: string
}

/**
 * Uploads a file buffer to BunnyCDN Storage.
 * @param buffer - The file content as a Buffer
 * @param storagePath - The path within the storage zone, e.g. "logos/titanus-gym/logo.webp"
 * @param mimeType - The MIME type of the file, e.g. "image/webp"
 * @returns The public CDN URL to access the file
 */
export async function uploadToBunny(
  buffer: Buffer,
  storagePath: string,
  mimeType: string
): Promise<BunnyUploadResult> {
  if (!BUNNY_STORAGE_API_KEY) {
    throw new Error('BUNNY_STORAGE_API_KEY no está configurada')
  }

  const uploadUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${storagePath}`

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_API_KEY,
      'Content-Type': mimeType,
    },
    // Convert Buffer → Uint8Array so fetch() accepts it as BodyInit
    body: new Uint8Array(buffer),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => `HTTP ${response.status}`)
    throw new Error(`BunnyCDN upload failed (${response.status}): ${errorText}`)
  }

  const cdnUrl = `${BUNNY_PULLZONE_URL}/${storagePath}`

  return {
    cdnUrl,
    storagePath,
  }
}

/**
 * Deletes a file from BunnyCDN Storage.
 * @param storagePath - The path within the storage zone
 */
export async function deleteFromBunny(storagePath: string): Promise<void> {
  if (!BUNNY_STORAGE_API_KEY) return

  const deleteUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${storagePath}`

  await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      AccessKey: BUNNY_STORAGE_API_KEY,
    },
  })
}

/**
 * Extracts the storage path from a CDN URL.
 * e.g. "https://mvps.b-cdn.net/logos/abc/logo.webp" → "logos/abc/logo.webp"
 */
export function cdnUrlToStoragePath(cdnUrl: string): string | null {
  try {
    const url = new URL(cdnUrl)
    // Remove leading slash
    return url.pathname.replace(/^\//, '')
  } catch {
    return null
  }
}

