/**
 * POST /api/superadmin/tenants/[id]/logo
 *
 * Accepts multipart/form-data with:
 *   - logo: File  (required — image file: webp, png, jpg, svg, etc.)
 *   - primaryColor: string (optional — manual hex override, e.g. "#FCDD09")
 *
 * Flow:
 * 1. Validate SuperAdmin session
 * 2. Find the tenant
 * 3. Upload logo to BunnyCDN → get public CDN URL
 * 4. Extract dominant brand color from image using sharp (unless manual color given)
 * 5. Delete previous logo from Bunny (if any)
 * 6. Update Tenant record: logoUrl = CDN URL, primaryColor = extracted/manual
 * 7. Return updated tenant data
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSuperAdminFromRequest } from '@/lib/auth'
import { uploadToBunny, deleteFromBunny, cdnUrlToStoragePath } from '@/lib/bunny'
import { extractDominantColor } from '@/lib/colorExtract'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSuperAdminFromRequest(req)
    const { id } = await params

    const tenant = await prisma.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Gimnasio no encontrado' },
        { status: 404 }
      )
    }

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Se requiere multipart/form-data con campo "logo"' },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file =
      (formData.get('logo') as File | null) ||
      (formData.get('file') as File | null)
    const manualColor = (formData.get('primaryColor') as string | null)?.trim()

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No se recibió archivo de logo' },
        { status: 400 }
      )
    }

    // ── 1. Prepare buffer & metadata ───────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'image/png'

    // Determine file extension from MIME type
    const extMap: Record<string, string> = {
      'image/webp': 'webp',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/svg+xml': 'svg',
      'image/gif': 'gif',
      'image/avif': 'avif',
    }
    const ext = extMap[mimeType] ?? 'png'

    // Storage path: logos/{tenantSlug}/logo.{ext}
    // Using slug so it's human-readable in Bunny dashboard
    const storagePath = `logos/${tenant.slug}/logo.${ext}`

    // ── 2. Delete previous logo from Bunny (if URL is a CDN URL) ──────────
    if (tenant.logoUrl) {
      const oldPath = cdnUrlToStoragePath(tenant.logoUrl)
      if (oldPath && !tenant.logoUrl.startsWith('data:')) {
        // Fire-and-forget — don't block on delete failure
        deleteFromBunny(oldPath).catch((err) =>
          console.warn('[logo] Could not delete old logo from Bunny:', err)
        )
      }
    }

    // ── 3. Upload to BunnyCDN ──────────────────────────────────────────────
    const { cdnUrl } = await uploadToBunny(buffer, storagePath, mimeType)

    // ── 4. Extract dominant color ──────────────────────────────────────────
    let primaryColor: string | null = manualColor || null

    // Only extract from image if no manual color was given
    // SVGs can't be processed by sharp — skip extraction for them
    if (!primaryColor && mimeType !== 'image/svg+xml') {
      primaryColor = await extractDominantColor(buffer)
      console.log(`[logo] Extracted color for "${tenant.slug}": ${primaryColor}`)
    }

    // ── 5. Update tenant in DB ─────────────────────────────────────────────
    const dataToUpdate: { logoUrl: string; primaryColor?: string } = {
      logoUrl: cdnUrl,
    }
    if (primaryColor) {
      dataToUpdate.primaryColor = primaryColor
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json({
      success: true,
      logoUrl: updated.logoUrl,
      primaryColor: updated.primaryColor,
      tenant: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl,
        primaryColor: updated.primaryColor,
      },
    })
  } catch (error: any) {
    console.error('[logo] Error al subir logo:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: error.message?.includes('No autorizado') ? 401 : 500 }
    )
  }
}
