import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    console.error('Error consultando Evolution API en config:', err)
  }
  return null
}

// GET /api/club/config: Obtiene la configuración actual del Tenant sincronizada en tiempo real con Evolution
export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
    }

    // Consultar el número dinámico conectado en tiempo real a la instancia de Evolution
    const livePhone = await getEvolutionLiveNumber(tenant.evolutionInstanceName)

    // Si hay un número conectado en Evolution y difiere del guardado en la BD, sincronizarlo en background
    if (livePhone && livePhone !== tenant.whatsappPhone) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappPhone: livePhone },
      })
      tenant.whatsappPhone = livePhone
    }

    // Regla de Branding Jerárquico:
    // Si el tenant no tiene logo personalizado ni color explícito, aplicar ALL-CRM Default
    const isCustomBranded = Boolean(tenant.logoUrl)
    const effectiveLogoUrl = tenant.logoUrl || '/branding/logo_negative.png'
    const effectivePrimaryColor = tenant.primaryColor || (isCustomBranded ? '#ffe202' : '#00F5D4')
    const effectiveSecondaryColor = tenant.secondaryColor || (isCustomBranded ? '#000000' : '#00E5FF')

    return NextResponse.json({
      ...tenant,
      isCustomBranded,
      logoUrl: effectiveLogoUrl,
      primaryColor: effectivePrimaryColor,
      secondaryColor: effectiveSecondaryColor,
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// POST /api/club/config: Actualiza porcentajes de Cashback y Google Review URL
export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const body = await req.json()
    const {
      referralCommPct,
      storeReferralCommPct,
      googleReviewUrl,
      whatsappPhone,
      primaryColor,
      secondaryColor,
      logoUrl,
    } = body

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        referralCommPct: referralCommPct !== undefined ? Number(referralCommPct) : undefined,
        storeReferralCommPct: storeReferralCommPct !== undefined ? Number(storeReferralCommPct) : undefined,
        googleReviewUrl: googleReviewUrl !== undefined ? googleReviewUrl : undefined,
        whatsappPhone: whatsappPhone !== undefined ? whatsappPhone : undefined,
        primaryColor: primaryColor !== undefined ? primaryColor : undefined,
        secondaryColor: secondaryColor !== undefined ? secondaryColor : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
      },
    })

    return NextResponse.json({ success: true, tenant: updated })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
