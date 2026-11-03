import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// POST /api/club/qr/generate: Genera un token QR dinámico y efímero (válido por ej. 15 minutos)
export async function POST(req: Request) {
  try {
    const { type } = await req.json() // 'MEMBERSHIP' | 'RETAIL' | 'EVALUATION'

    if (!type || !['MEMBERSHIP', 'RETAIL', 'EVALUATION'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de QR inválido' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    if (!tenant) return NextResponse.json({ error: 'Tenant no configurado' }, { status: 400 })

    // Prefijos tácticos: MEM-, RET-, EVAL-
    const prefix = type === 'MEMBERSHIP' ? 'MEM' : type === 'RETAIL' ? 'RET' : 'EVAL'
    // Código aleatorio único de 5 caracteres alfanuméricos (evita repetición y fraude)
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase()
    const tokenString = `${prefix}-${randomSuffix}`

    // Expira en 15 minutos para que no pueda ser reusado luego
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    // Guardar en la tabla QrToken de MySQL
    const qrToken = await prisma.qrToken.create({
      data: {
        tenantId: tenant.id,
        type: type,
        token: tokenString,
        expiresAt: expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      token: qrToken.token,
      expiresAt: qrToken.expiresAt,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

