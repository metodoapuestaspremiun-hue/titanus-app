import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'

// GET: Lista pagos pendientes en caja
export async function GET() {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    if (!tenant) return NextResponse.json({ payments: [] })

    const payments = await prisma.payment.findMany({
      where: { tenantId: tenant.id, status: 'PENDING' },
      include: {
        customer: { include: { wallets: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ payments })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Aprobar o rechazar un pago y acreditar cashback a la Wallet
export async function POST(req: Request) {
  try {
    const { paymentId, action, finalAmount, productDescription } = await req.json()
    // action: 'APPROVE' | 'REJECT'
    // finalAmount: opcional, para cuando recepción edita el monto de retail

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: { include: { wallets: true } },
        tenant: true,
      },
    })

    if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

    if (action === 'REJECT') {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REJECTED' },
      })
      await sendWhatsAppMessage(
        payment.customer.phone,
        `❌ *${payment.tenant.name}*\n\nTu solicitud de pago no fue aprobada. Por favor acércate a recepción para más información.`
      )
      return NextResponse.json({ success: true, status: 'REJECTED' })
    }

    // Calcular montos finales (para retail, el monto puede venir de recepción)
    const amount = finalAmount ? Number(finalAmount) : Number(payment.amount)
    const cashbackPct = Number(payment.cashbackPct)
    const cashbackAmt = parseFloat(((amount * cashbackPct) / 100).toFixed(2))

    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar pago como aprobado con monto definitivo y descripción del producto
      const descFinal = productDescription
        ? `${payment.description || 'Compra'} · ${productDescription}`
        : payment.description || (payment.type === 'RETAIL' ? 'Compra en Tienda/Barra' : 'Pago de cuota')
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          amount,
          cashbackAmt,
          description: descFinal,
        },
      })

      // 2. Obtener o crear Wallet del socio
      let wallet = await tx.wallet.findUnique({
        where: { customerId: payment.customerId },
      })
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { tenantId: payment.tenantId, customerId: payment.customerId, balance: 0 },
        })
      }

      // 3. Acreditar Cashback a la Wallet
      const newBalance = parseFloat((Number(wallet.balance) + cashbackAmt).toFixed(2))
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      })

      // 4. Registrar en auditoría de transacciones
      await tx.walletTransaction.create({
        data: {
          tenantId: payment.tenantId,
          walletId: wallet.id,
          type: 'CASHBACK_EARNED',
          amount: cashbackAmt,
          description: `Cashback ${cashbackPct}% por ${payment.type === 'MEMBERSHIP' ? 'Cuota' : `Barra/Retail${productDescription ? ` (${productDescription})` : ''}`} - $${amount.toFixed(2)}`,
          referenceId: payment.id,
        },
      })

      return { updatedPayment, newBalance }
    })

    const tipo = payment.type === 'MEMBERSHIP' ? 'cuota mensual' : 'compra en barra'
    const prodLine = productDescription ? `\n📦 Producto: *${productDescription}*` : ''
    await sendWhatsAppMessage(
      payment.customer.phone,
      `✅ *¡Pago Aprobado en Caja, Spartan!*\n\n🏋️ *${payment.tenant.name}*\n\n💵 ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}: *$${amount.toFixed(2)} USD*${prodLine}\n🎁 Cashback acreditado: *+$${cashbackAmt.toFixed(2)} USD* (${cashbackPct}%)\n💰 Tu nuevo saldo en Monedero: *$${result.newBalance.toFixed(2)} USD*\n\n¡Gracias por confiar en Titanus! Puedes canjear tu saldo en tu próxima visita. 💪`
    )

    return NextResponse.json({ success: true, status: 'APPROVED', newBalance: result.newBalance })
  } catch (error: any) {
    console.error('Error al procesar aprobación de pago:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
