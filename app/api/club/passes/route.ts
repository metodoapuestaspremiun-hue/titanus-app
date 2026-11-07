import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const tenantSlug = searchParams.get('tenant') || 'titanus-gym'

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
    }

    if (!code) {
      // Listar pases recientes para auditoría en el Dashboard
      const passes = await prisma.friendPass.findMany({
        where: { tenantId: tenant.id },
        include: {
          sponsor: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return NextResponse.json({ passes })
    }

    // Verificar código específico
    const normalizedCode = code.trim().toUpperCase()
    const pass = await prisma.friendPass.findUnique({
      where: { code: normalizedCode },
      include: {
        sponsor: {
          select: { id: true, name: true, phone: true },
        },
      },
    })

    if (!pass || pass.tenantId !== tenant.id) {
      return NextResponse.json({
        valid: false,
        error: 'El código no existe o no pertenece a este gimnasio.',
      }, { status: 404 })
    }

    if (pass.status === 'REDEEMED') {
      return NextResponse.json({
        valid: false,
        error: `Este pase ya fue utilizado el ${new Date(pass.redeemedAt || '').toLocaleDateString('es-ES')} por ${pass.redeemedByName || 'un usuario'}.`,
        pass,
      }, { status: 400 })
    }

    if (new Date() > pass.expiresAt) {
      return NextResponse.json({
        valid: false,
        error: `Este pase expiró el ${new Date(pass.expiresAt).toLocaleDateString('es-ES')}.`,
        pass,
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      pass: {
        id: pass.id,
        code: pass.code,
        status: pass.status,
        expiresAt: pass.expiresAt,
        sponsor: pass.sponsor,
      },
    })
  } catch (error: any) {
    console.error('Error al consultar friend pass:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { passId, redeemedByName, redeemedByPhone, tenantSlug = 'titanus-gym' } = body

    if (!passId || !redeemedByName) {
      return NextResponse.json({ error: 'Faltan campos requeridos (passId, redeemedByName)' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
    }

    const pass = await prisma.friendPass.findUnique({
      where: { id: passId },
      include: {
        sponsor: true,
      },
    })

    if (!pass || pass.tenantId !== tenant.id) {
      return NextResponse.json({ error: 'Pase no encontrado' }, { status: 404 })
    }

    if (pass.status === 'REDEEMED') {
      return NextResponse.json({ error: 'Este pase ya fue utilizado previamente' }, { status: 400 })
    }

    if (new Date() > pass.expiresAt) {
      return NextResponse.json({ error: 'Este pase está vencido' }, { status: 400 })
    }

    // 1. Canjear el pase atómicamente
    const updatedPass = await prisma.friendPass.update({
      where: { id: passId },
      data: {
        status: 'REDEEMED',
        redeemedByName: redeemedByName.trim(),
        redeemedByPhone: redeemedByPhone ? redeemedByPhone.replace(/\D/g, '') : null,
        redeemedAt: new Date(),
      },
    })

    // 2. Si el amigo dio su WhatsApp, enviar mensaje de bienvenida del gym
    if (redeemedByPhone && tenant.evolutionInstanceName) {
      const cleanPhone = redeemedByPhone.replace(/\D/g, '')
      try {
        await sendWhatsAppMessage(
          cleanPhone,
          `🏋️ *¡BIENVENIDO A ${tenant.name.toUpperCase()}!*\n\nHola *${redeemedByName.trim()}*! 👋\n\nTu *Pase de Cortesía de 1 Día* ha sido canjeado exitosamente en recepción por invitación de *${pass.sponsor.name}*.\n\nDisfruta tu entrenamiento al máximo hoy. 💪🔥`,
          tenant.evolutionInstanceName
        )
      } catch (err) {
        console.warn('No se pudo enviar WhatsApp al amigo:', err)
      }
    }

    return NextResponse.json({
      success: true,
      pass: updatedPass,
      message: 'Pase canjeado con éxito. Acceso concedido al amigo.',
    })
  } catch (error: any) {
    console.error('Error al canjear friend pass:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
