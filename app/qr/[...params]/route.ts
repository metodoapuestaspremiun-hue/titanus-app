import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { verifyTenantToken, TENANT_COOKIE_NAME } from '@/lib/auth'

// Esta ruta procesa el escaneo del cartel físico permanente:
// Formatos soportados:
// 1. /qr/[slug]/[type]/[branchCode]  (ej: /qr/titanus-gym/m/sur -> Genera token de Sede Sur)
// 2. /qr/[slug]/[type]               (ej: /qr/titanus-gym/m -> Genera token multi-sede)
// 3. /qr/[type]                      (ej: /qr/m con fallback a Titanus Gym)

export async function GET(
  req: Request,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    const { params: routeSegments } = await params
    const segments = routeSegments || []

    let targetSlug: string | null = null
    let rawType = 'm'
    let branchCodeParam: string | null = null

    if (segments.length >= 3) {
      // Formato: /qr/[slug]/[type]/[branchCode]
      targetSlug = segments[0]?.toLowerCase()
      rawType = segments[1]?.toLowerCase()
      branchCodeParam = segments[2]?.toUpperCase()
    } else if (segments.length === 2) {
      // Formato: /qr/[slug]/[type]
      targetSlug = segments[0]?.toLowerCase()
      rawType = segments[1]?.toLowerCase()
    } else if (segments.length === 1) {
      // Formato: /qr/[type]
      rawType = segments[0]?.toLowerCase()
    }

    const typeLower = rawType.toLowerCase()

    let qrType = 'MEMBERSHIP'
    let prefix = 'MEM'

    if (typeLower === 't' || typeLower === 'tienda' || typeLower === 'retail') {
      qrType = 'RETAIL'
      prefix = 'RET'
    } else if (typeLower === 'c' || typeLower === 'coach' || typeLower === 'eval') {
      qrType = 'EVALUATION'
      prefix = 'EVAL'
    } else if (typeLower === 'm' || typeLower === 'mensualidad') {
      qrType = 'MEMBERSHIP'
      prefix = 'MEM'
    }

    const { searchParams } = new URL(req.url)
    const slugQuery = searchParams.get('slug')?.toLowerCase().trim() || targetSlug?.trim()
    const queryBranch = searchParams.get('branch')?.toUpperCase().trim() || branchCodeParam

    let tenant = null
    if (slugQuery) {
      tenant = await prisma.tenant.findUnique({ where: { slug: slugQuery } })
      if (!tenant) {
        tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { evolutionInstanceName: slugQuery },
              { evolutionInstanceName: `gym_${slugQuery.replace(/-/g, '_')}` },
              { name: { equals: slugQuery } },
            ],
          },
        })
      }
    }

    // Resolver por cookie si no vino en URL
    if (!tenant) {
      const cookieHeader = req.headers.get('cookie')
      if (cookieHeader) {
        const match = cookieHeader
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith(`${TENANT_COOKIE_NAME}=`))
        if (match) {
          const tokenCookie = decodeURIComponent(match.substring(TENANT_COOKIE_NAME.length + 1))
          try {
            const { tenantId } = await verifyTenantToken(tokenCookie)
            tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
          } catch {}
        }
      }
    }

    // Fallback a Titanus Gym
    if (!tenant) {
      tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    }

    if (!tenant) {
      return new Response('Gimnasio no encontrado', { status: 404 })
    }

    // 1. Resolver sucursal física asociada al cartel si vino especificada
    let branchCodeTag = ''
    if (queryBranch) {
      const branch = await prisma.branch.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [
            { code: queryBranch },
            { name: { equals: queryBranch } },
          ],
          isActive: true,
        },
      })
      if (branch) {
        branchCodeTag = `-${branch.code}`
      }
    }

    // 2. Generar token criptográfico efímero de un solo uso (TTL: 15 minutos de holgura)
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase()
    const dynamicToken = `${prefix}${branchCodeTag}-${randomSuffix}` // ej: MEM-SUR-7A9B o MEM-8F3K
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.qrToken.create({
      data: {
        tenantId: tenant.id,
        type: qrType,
        token: dynamicToken,
        expiresAt: expiresAt,
      },
    })

    // 3. Obtener el número de WhatsApp oficial conectado en Evolution API
    let whatsappPhone = tenant.whatsappPhone || '593986962872'
    try {
      const evoUrl = tenant.evolutionApiUrl || process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080'
      const evoKey = tenant.evolutionApiKey || process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621'
      const evoInst = tenant.evolutionInstanceName || 'gym_bot'

      const evoRes = await fetch(`${evoUrl}/instance/fetchInstances`, {
        headers: { apikey: evoKey },
        cache: 'no-store',
      })
      const data = await evoRes.json()
      const list = Array.isArray(data) ? data : data?.value || []
      const target = list.find((i: any) => i.name === evoInst)

      if (target && target.ownerJid) {
        whatsappPhone = target.ownerJid.split('@')[0].replace(/[^0-9]/g, '')
      }
    } catch (err) {
      console.warn('Fallback al número registrado en base de datos:', err)
    }

    // 4. Redirección instantánea (0.1 seg) hacia WhatsApp con el token efímero preescrito
    const messageText = `Hola, mi código es ${dynamicToken}`
    const waUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(messageText)}`

    return NextResponse.redirect(waUrl, 302)
  } catch (error) {
    console.error('Error en redirección de QR dinámico permanente:', error)
    return new Response('Error procesando el escaneo', { status: 500 })
  }
}
