import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'
import { getTenantFromRequest } from '@/lib/getTenant'

// POST /api/club/wallet: Canjea saldo de la billetera en recepción para el tenant autenticado
export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { customerId, amountToRedeem, description } = await req.json()

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        wallets: { where: { tenantId } },
        tenant: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Socio no encontrado o no pertenece a su club' }, { status: 404 })
    }

    const wallet = customer.wallets[0]
    if (!wallet || Number(wallet.balance) < Number(amountToRedeem)) {
      return NextResponse.json({ error: 'Saldo insuficiente en monedero' }, { status: 400 })
    }

    // Validación de expiración de cashback (Vencimiento de membresía + 30 días de gracia)
    if (customer.membershipExpiry) {
      const expiry = new Date(customer.membershipExpiry)
      const cashbackDeadline = new Date(expiry.getTime() + 30 * 24 * 60 * 60 * 1000)
      if (new Date() > cashbackDeadline) {
        return NextResponse.json({
          error: 'El saldo de cashback de este socio ha expirado porque superó los 30 días de gracia sin renovar membresía.',
        }, { status: 400 })
      }
    }

    const newBalance = Number(wallet.balance) - Number(amountToRedeem)

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          tenantId: wallet.tenantId,
          walletId: wallet.id,
          type: 'REDEEMED',
          amount: amountToRedeem,
          description: description || 'Canje de saldo en mostrador',
        },
      }),
    ])

    // Notificar al WhatsApp del socio con el nombre de su gimnasio e instancia
    await sendWhatsAppMessage(
      customer.phone,
      `🎟️ *${customer.tenant.name} - Canje Exitoso*\nSe ha descontado *$${amountToRedeem} USD* de tu monedero digital.\nTu nuevo saldo disponible es: *$${newBalance.toFixed(2)} USD*.`,
      customer.tenant.evolutionInstanceName
    )

    return NextResponse.json({ success: true, newBalance })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
