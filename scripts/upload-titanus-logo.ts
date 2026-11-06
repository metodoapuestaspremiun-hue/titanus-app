/**
 * Script: upload-titanus-logo.ts
 * 
 * Uploads the Titanus Gym logo (public/Logo.webp) to BunnyCDN,
 * extracts the dominant brand color, and updates the Titanus tenant record in DB.
 *
 * Run with: npx tsx scripts/upload-titanus-logo.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const prisma = new PrismaClient()

// ── BunnyCDN helpers (inline, no import needed from lib/) ──────────────────
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'mvps'
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY || ''
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com'
const BUNNY_PULLZONE_URL = process.env.BUNNY_PULLZONE_URL || 'https://mvps.b-cdn.net'

async function uploadToBunny(buffer: Buffer, storagePath: string, mimeType: string): Promise<string> {
  const uploadUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${storagePath}`
  console.log(`  → Uploading to: ${uploadUrl}`)

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_API_KEY,
      'Content-Type': mimeType,
    },
    body: new Uint8Array(buffer),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => `HTTP ${response.status}`)
    throw new Error(`BunnyCDN upload failed (${response.status}): ${errorText}`)
  }

  return `${BUNNY_PULLZONE_URL}/${storagePath}`
}

// ── Color extraction (inline sharp usage) ─────────────────────────────────
async function extractColor(buffer: Buffer): Promise<string | null> {
  try {
    // Dynamic import of sharp (ES module compatible)
    const sharp = (await import('sharp')).default

    const { data, info } = await sharp(buffer)
      .resize(64, 64, { fit: 'fill' })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels = info.width * info.height
    const channels = info.channels

    // Color bucket quantization
    const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()

    for (let i = 0; i < pixels; i++) {
      const offset = i * channels
      const r = data[offset], g = data[offset + 1], b = data[offset + 2]
      const rq = Math.round(r / 16) * 16
      const gq = Math.round(g / 16) * 16
      const bq = Math.round(b / 16) * 16
      const key = `${rq},${gq},${bq}`
      const ex = buckets.get(key)
      if (ex) ex.count++
      else buckets.set(key, { r: rq, g: gq, b: bq, count: 1 })
    }

    function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
      const rn = r/255, gn = g/255, bn = b/255
      const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn)
      const l = (max+min)/2
      if (max===min) return [0,0,l]
      const d = max-min
      const s = l>0.5 ? d/(2-max-min) : d/(max+min)
      let h = 0
      if (max===rn) h = ((gn-bn)/d+(gn<bn?6:0))/6
      else if (max===gn) h = ((bn-rn)/d+2)/6
      else h = ((rn-gn)/d+4)/6
      return [h,s,l]
    }

    let bestScore = -1
    let bestColor = { r: 252, g: 221, b: 9 }

    for (const bucket of buckets.values()) {
      const [,s,l] = rgbToHsl(bucket.r, bucket.g, bucket.b)
      if (l < 0.08 || l > 0.92 || s < 0.08) continue
      const lScore = 1 - Math.abs(l - 0.5) * 1.5
      const score = bucket.count * s * Math.max(0, lScore)
      if (score > bestScore) { bestScore = score; bestColor = bucket }
    }

    const hex = '#' + [bestColor.r, bestColor.g, bestColor.b]
      .map(v => v.toString(16).padStart(2,'0')).join('')
    return hex
  } catch (err) {
    console.error('  ✗ Color extraction failed:', err)
    return null
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🏋️  Titanus Logo → BunnyCDN Upload Script')
  console.log('═══════════════════════════════════════════\n')

  // 1. Read the logo file
  const logoPath = path.resolve(__dirname, '../public/Logo.webp')
  if (!fs.existsSync(logoPath)) {
    console.error(`✗ Logo not found at: ${logoPath}`)
    process.exit(1)
  }

  const buffer = fs.readFileSync(logoPath)
  console.log(`✓ Logo loaded: ${logoPath} (${buffer.length} bytes)`)

  // 2. Check Bunny config
  if (!BUNNY_STORAGE_API_KEY) {
    console.error('✗ BUNNY_STORAGE_API_KEY is not set in .env.local')
    process.exit(1)
  }
  console.log(`✓ BunnyCDN zone: ${BUNNY_STORAGE_ZONE} → ${BUNNY_PULLZONE_URL}`)

  // 3. Upload to BunnyCDN
  console.log('\n📤 Uploading logo to BunnyCDN...')
  const storagePath = 'logos/titanus-gym/logo.webp'
  const cdnUrl = await uploadToBunny(buffer, storagePath, 'image/webp')
  console.log(`✓ CDN URL: ${cdnUrl}`)

  // 4. Extract dominant color
  console.log('\n🎨 Extracting dominant brand color...')
  const color = await extractColor(buffer)
  console.log(`✓ Dominant color: ${color ?? '(failed — keeping existing)'}`)

  // 5. Find Titanus tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
  if (!tenant) {
    console.error('✗ Tenant "titanus-gym" not found in DB')
    process.exit(1)
  }
  console.log(`\n✓ Tenant found: "${tenant.name}" (id: ${tenant.id})`)

  // 6. Update DB
  const updateData: any = { logoUrl: cdnUrl }
  if (color) updateData.primaryColor = color

  const updated = await prisma.tenant.update({
    where: { slug: 'titanus-gym' },
    data: updateData,
  })

  console.log('\n✅ Tenant updated successfully:')
  console.log(`   logoUrl:      ${updated.logoUrl}`)
  console.log(`   primaryColor: ${updated.primaryColor}`)
  console.log('\n🎉 Done! The Titanus logo is now live on BunnyCDN.')
}

main()
  .catch((err) => {
    console.error('\n✗ Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

