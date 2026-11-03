import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'

// POST /api/club/wallet/redeem: Canjea saldo de la billetera en recepción
export async function POST(req: Request) {
  try {
    const { customerId, amountToRedeem, description } = await req.json()

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { wallets: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 })
    }

    const wallet = customer.wallets[0]
    if (!wallet || Number(wallet.balance) < Number(amountToRedeem)) {
      return NextResponse.json({ error: 'Saldo insuficiente en monedero' }, { status: 400 })
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

    // Notificar al WhatsApp del socio
    await sendWhatsAppMessage(
      customer.phone,
      `🎟️ *Titanus Gym - Canje Exitoso*\nSe ha descontado *$${amountToRedeem} USD* de tu monedero digital.\nTu nuevo saldo disponible es: *$${newBalance.toFixed(2)} USD*.`
    )

    return NextResponse.json({ success: true, newBalance })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

