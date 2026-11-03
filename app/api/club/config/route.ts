import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/club/config: Obtiene la configuración actual del Tenant
export async function GET() {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: 'titanus-gym' },
    })
    return NextResponse.json(tenant)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/club/config: Actualiza porcentajes de Cashback y Google Review URL
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { referralCommPct, storeReferralCommPct, googleReviewUrl, whatsappPhone } = body

    const updated = await prisma.tenant.update({
      where: { slug: 'titanus-gym' },
      data: {
        referralCommPct: referralCommPct !== undefined ? Number(referralCommPct) : undefined,
        storeReferralCommPct: storeReferralCommPct !== undefined ? Number(storeReferralCommPct) : undefined,
        googleReviewUrl: googleReviewUrl !== undefined ? googleReviewUrl : undefined,
        whatsappPhone: whatsappPhone !== undefined ? whatsappPhone : undefined,
      },
    })

    return NextResponse.json({ success: true, tenant: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

