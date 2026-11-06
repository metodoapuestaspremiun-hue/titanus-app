import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/qr/check?token=MEM-XXXXXX
// Verifica si el token sigue activo o si ya fue consumido por el webhook de WhatsApp
export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token no especificado' }, { status: 400 })
    }

    const qrRecord = await prisma.qrToken.findFirst({
      where: {
        tenantId,
        token,
        expiresAt: { gt: new Date() },
      },
    })

    // Si ya no existe en la base de datos (fue borrado en el webhook al ser consumido), significa que fue usado
    return NextResponse.json({
      active: Boolean(qrRecord),
      consumed: !qrRecord,
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

