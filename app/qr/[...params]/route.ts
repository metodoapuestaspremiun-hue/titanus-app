import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { verifyTenantToken, TENANT_COOKIE_NAME } from '@/lib/auth'

// Esta ruta procesa el escaneo del cartel físico tanto para:
// 1. Rutas con slug directo: /qr/titanus-gym/m | /qr/sparta/t | /qr/sparta/c
// 2. Rutas legacy: /qr/m | /qr/t | /qr/c (con opcional ?slug=...)

export async function GET(
  req: Request,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    const { params: routeSegments } = await params
    const segments = routeSegments || []

    let targetSlug: string | null = null
    let rawType = 'm'

    if (segments.length >= 2) {
      // Formato: /qr/[slug]/[type]
      targetSlug = segments[0]?.toLowerCase()
      rawType = segments[1]?.toLowerCase()
    } else if (segments.length === 1) {
      // Formato: /qr/[type] (puede venir con ?slug= en la URL)
      rawType = segments[0]?.toLowerCase()
    }

    const typeUpper = rawType.toLowerCase()

    let qrType = 'MEMBERSHIP'
    let prefix = 'MEM'

    if (typeUpper === 't' || typeUpper === 'tienda' || typeUpper === 'retail') {
      qrType = 'RETAIL'
      prefix = 'RET'
    } else if (typeUpper === 'c' || typeUpper === 'coach' || typeUpper === 'eval') {
      qrType = 'EVALUATION'
      prefix = 'EVAL'
    } else if (typeUpper === 'm' || typeUpper === 'mensualidad') {
      qrType = 'MEMBERSHIP'
      prefix = 'MEM'
    }

    const { searchParams } = new URL(req.url)
    const slugQuery = searchParams.get('slug')?.toLowerCase().trim() || targetSlug?.trim()
    const existingToken = searchParams.get('token')

    let tenant = null
    if (slugQuery) {
      // 1. Buscar por slug exacto
      tenant = await prisma.tenant.findUnique({ where: { slug: slugQuery } })

      // 2. Si no coincide, buscar por nombre de instancia Evolution o por nombre insensible a mayúsculas
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

    // 3. Si no vino slug, intentar resolver por cookie de sesión
    if (!tenant) {
      const cookieHeader = req.headers.get('cookie')
      if (cookieHeader) {
        const match = cookieHeader
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith(`${TENANT_COOKIE_NAME}=`))
        if (match) {
          const token = decodeURIComponent(match.substring(TENANT_COOKIE_NAME.length + 1))
          try {
            const { tenantId } = await verifyTenantToken(token)
            tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
          } catch {}
        }
      }
    }

    // 4. Si aún no está en BD pero vino un slug, consultar directamente a Evolution API
    let liveEvoPhone: string | null = null
    const evoUrl = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080'
    const evoKey = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621'

    if (!tenant && slugQuery) {
      try {
        const evoRes = await fetch(`${evoUrl}/instance/fetchInstances`, {
          headers: { apikey: evoKey },
          cache: 'no-store',
        })
        const instances = await evoRes.json()
        const list = Array.isArray(instances) ? instances : instances?.value || []
        const matched = list.find(
          (i: any) =>
            i.name?.toLowerCase() === slugQuery ||
            i.name?.toLowerCase() === `gym_${slugQuery.replace(/-/g, '_')}`
        )
        if (matched && matched.ownerJid) {
          liveEvoPhone = matched.ownerJid.split('@')[0].replace(/[^0-9]/g, '')
        }
      } catch (e) {
        console.error('Error buscando instancia en fallback:', e)
      }
    }

    // 5. Fallback a Titanus Gym si no se pudo determinar
    if (!tenant && !liveEvoPhone) {
      tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    }

    // Si aún así no hay tenant ni número, usar el teléfono default en lugar de tirar error 404
    const resolvedPhone = liveEvoPhone || tenant?.whatsappPhone || '593986962872'

    let token = existingToken
    if (!token) {
      // 1. Generar token único criptográfico efímero
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase()
      token = `${prefix}-${randomSuffix}`

      // 2. Guardar en la tabla QrToken con TTL de 2 minutos
      const expiresAt = new Date(Date.now() + 120 * 1000)

      if (tenant) {
        await prisma.qrToken.create({
          data: {
            tenantId: tenant.id,
            type: qrType,
            token: token,
            expiresAt: expiresAt,
          },
        })
      }
    }

    // 3. Obtener dinámicamente el número REAL conectado a la instancia en Evolution API
    let whatsappPhone: string | null = null

    try {
      const evoUrl =
        tenant?.evolutionApiUrl ||
        process.env.EVOLUTION_API_URL ||
        'http://178.238.238.158:8080'
      const evoKey =
        tenant?.evolutionApiKey ||
        process.env.EVOLUTION_API_KEY ||
        '42a447c1-3d74-4b52-9571-042c174f7621'
      const evoInst =
        tenant?.evolutionInstanceName ||
        slugQuery ||
        process.env.EVOLUTION_INSTANCE_NAME ||
        'gym_bot'

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
      console.error('Error obteniendo número de la instancia Evolution:', err)
    }

    // Fallback al teléfono de base de datos o default
    if (!whatsappPhone) {
      whatsappPhone =
        resolvedPhone ||
        (tenant?.whatsappPhone && tenant.whatsappPhone.length > 8
          ? tenant.whatsappPhone
          : '593986962872')
    }

    const messageText = `Hola, mi código es ${token}`
    const waUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(messageText)}`

    return NextResponse.redirect(waUrl, 302)
  } catch (error) {
    console.error('Error en redirección de QR dinámico:', error)
    return new Response('Error procesando el escaneo', { status: 500 })
  }
}

