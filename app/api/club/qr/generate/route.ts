import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { getTenantFromRequest } from '@/lib/getTenant'

// Función para obtener el número real conectado actualmente a la instancia de Evolution
async function getEvolutionLiveNumber(instanceName?: string | null): Promise<string | null> {
  try {
    const evoUrl = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080'
    const evoKey = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621'
    const evoInst = instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot'

    const evoRes = await fetch(`${evoUrl}/instance/fetchInstances`, {
      headers: { apikey: evoKey },
      cache: 'no-store',
    })
    const data = await evoRes.json()
    const list = Array.isArray(data) ? data : data?.value || []
    const target = list.find((i: any) => i.name === evoInst)

    if (target && target.ownerJid) {
      return target.ownerJid.split('@')[0].replace(/[^0-9]/g, '')
    }
  } catch (err) {
    console.error('Error consultando Evolution API en qr generate:', err)
  }
  return null
}

// POST /api/club/qr/generate: Genera un token QR dinámico y efímero (válido por 15 minutos)
export async function POST(req: Request) {
  try {
    const { tenantId, tenant } = await getTenantFromRequest(req)
    const { type } = await req.json() // 'MEMBERSHIP' | 'RETAIL' | 'EVALUATION'

    if (!type || !['MEMBERSHIP', 'RETAIL', 'EVALUATION'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de QR inválido' }, { status: 400 })
    }

    // Resolver en tiempo real el número actualmente conectado a la instancia del tenant
    const fullTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { evolutionInstanceName: true, whatsappPhone: true }
    })

    const livePhone = await getEvolutionLiveNumber(fullTenant?.evolutionInstanceName)
    let effectivePhone = livePhone || fullTenant?.whatsappPhone || '593986962872'

    // Si detectamos un nuevo número en Evolution que difiere del guardado, actualizar en background
    if (livePhone && livePhone !== fullTenant?.whatsappPhone) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappPhone: livePhone },
      })
    }

    // Prefijos tácticos: MEM-, RET-, EVAL-
    const prefix = type === 'MEMBERSHIP' ? 'MEM' : type === 'RETAIL' ? 'RET' : 'EVAL'
    // Código aleatorio único de 6 caracteres alfanuméricos (evita repetición y fraude)
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase()
    const tokenString = `${prefix}-${randomSuffix}`

    // Expira en 15 minutos para que no pueda ser reusado luego
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    // Guardar en la tabla QrToken vinculada al tenantId autenticado
    const qrToken = await prisma.qrToken.create({
      data: {
        tenantId,
        type: type,
        token: tokenString,
        expiresAt: expiresAt,
      },
    })

    const waUrl = `https://wa.me/${effectivePhone}?text=${encodeURIComponent(`Hola, mi código es ${tokenString}`)}`

    return NextResponse.json({
      success: true,
      token: qrToken.token,
      whatsappPhone: effectivePhone,
      waUrl: waUrl,
      expiresAt: qrToken.expiresAt,
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
