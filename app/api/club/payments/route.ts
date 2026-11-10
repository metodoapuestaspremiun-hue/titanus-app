import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET: Lista pagos pendientes en caja para el tenant autenticado y la sucursal activa
export async function GET(req: Request) {
  try {
    const { tenantId, branchId } = await getTenantFromRequest(req)

    const whereClause: any = { tenantId, status: 'PENDING' }
    if (branchId) {
      whereClause.branchId = branchId
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        customer: { include: { wallets: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ payments })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// POST: Aprobar o rechazar un pago y acreditar cashback a la Wallet
export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { paymentId, action, finalAmount, productDescription, referrerCustomerId } = await req.json()
    // action: 'APPROVE' | 'REJECT'
    // finalAmount: opcional, para cuando recepción edita el monto de retail
    // referrerCustomerId: opcional, socio que lo refirió para acreditarle comisión/bono

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        customer: { include: { wallets: true } },
        tenant: true,
      },
    })

    if (!payment) return NextResponse.json({ error: 'Pago no encontrado o no pertenece a su club' }, { status: 404 })

    const instanceName = payment.tenant.evolutionInstanceName

    if (action === 'REJECT') {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REJECTED' },
      })
      await sendWhatsAppMessage(
        payment.customer.phone,
        `❌ *${payment.tenant.name}*\n\nTu solicitud de pago no fue aprobada. Por favor acércate a recepción para más información.`,
        instanceName
      )
      return NextResponse.json({ success: true, status: 'REJECTED' })
    }

    // Calcular montos finales (para retail, el monto puede venir de recepción)
    const amount = finalAmount ? Number(finalAmount) : Number(payment.amount)
    const cashbackPct = Number(payment.cashbackPct)
    const cashbackAmt = parseFloat(((amount * cashbackPct) / 100).toFixed(2))

    // Verificar socio referente si se proporcionó
    let referrerCustomer: any = null
    if (referrerCustomerId && payment.type === 'MEMBERSHIP') {
      referrerCustomer = await prisma.customer.findFirst({
        where: { id: referrerCustomerId, tenantId },
        include: { wallets: true },
      })
    }

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

      // 1.1 Si es MENSUALIDAD, calcular vigencia de membresía y vigencia del cashback (duración membresía + 30 días de gracia)
      let planDurationDays = 30
      if (payment.type === 'MEMBERSHIP') {
        const matchedPlan = await tx.membershipPlan.findFirst({
          where: { tenantId: payment.tenantId, name: payment.description || '' },
        })
        if (matchedPlan?.durationDays) {
          planDurationDays = matchedPlan.durationDays
        }
        const now = new Date()
        const membershipExpiry = new Date(now.getTime() + planDurationDays * 24 * 60 * 60 * 1000)
        await tx.customer.update({
          where: { id: payment.customerId },
          data: {
            membershipActive: true,
            membershipExpiry,
          },
        })
      }

      // 2. Obtener o crear Wallet del socio que paga
      let wallet = await tx.wallet.findUnique({
        where: { customerId: payment.customerId },
      })
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { tenantId: payment.tenantId, customerId: payment.customerId, balance: 0 },
        })
      }

      // 3. Acreditar Cashback a la Wallet del socio pagador
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

      // 5. Si hay socio referente, acreditar Bono de Referido a su wallet
      let referrerBonusAmt = 0
      let referrerNewBalance = 0
      if (referrerCustomer && referrerCustomer.id !== payment.customerId) {
        const refCommPct = Number(payment.tenant.referralCommPct || 10.0)
        referrerBonusAmt = parseFloat(((amount * refCommPct) / 100).toFixed(2))

        let refWallet = await tx.wallet.findUnique({
          where: { customerId: referrerCustomer.id },
        })
        if (!refWallet) {
          refWallet = await tx.wallet.create({
            data: { tenantId: payment.tenantId, customerId: referrerCustomer.id, balance: 0 },
          })
        }

        referrerNewBalance = parseFloat((Number(refWallet.balance) + referrerBonusAmt).toFixed(2))
        await tx.wallet.update({
          where: { id: refWallet.id },
          data: { balance: referrerNewBalance },
        })

        await tx.walletTransaction.create({
          data: {
            tenantId: payment.tenantId,
            walletId: refWallet.id,
            type: 'CASHBACK_EARNED',
            amount: referrerBonusAmt,
            description: `🎁 Bono de Referido por inscripción de ${payment.customer.name} - $${amount.toFixed(2)} (${refCommPct}%)`,
            referenceId: payment.id,
          },
        })
      }

      // 6. Si es pago de MENSUALIDAD (MEMBERSHIP), generar 2 PASES DE AMIGO (FriendPass)
      const friendPassCodes: string[] = []
      if (payment.type === 'MEMBERSHIP') {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días de vigencia
        for (let i = 0; i < 2; i++) {
          const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
          const code = `AMIGO-${randomSuffix}`
          await tx.friendPass.create({
            data: {
              tenantId: payment.tenantId,
              sponsorId: payment.customerId,
              paymentId: payment.id,
              code,
              status: 'ACTIVE',
              expiresAt,
            },
          })
          friendPassCodes.push(code)
        }
      }

      return { updatedPayment, newBalance, friendPassCodes, referrerBonusAmt, referrerNewBalance }
    })

    const tipo = payment.type === 'MEMBERSHIP' ? 'cuota mensual' : 'compra en barra'
    const prodLine = productDescription ? `\n📦 Producto: *${productDescription}*` : ''
    
    // Mensaje de Pases de Amigo si aplica
    let passesSection = ''
    if (result.friendPassCodes && result.friendPassCodes.length > 0) {
      passesSection = `\n\n🎁 *BENEFICIO EXCLUSIVO: 2 PASES DE CORTESÍA (1 DÍA)*\n` +
        `¡Invita a 2 amigos a entrenar gratis contigo! Cada amigo debe dictar su código único en recepción al llegar:\n\n` +
        `🎟️ *Pase 1:* \`${result.friendPassCodes[0]}\`\n` +
        `🎟️ *Pase 2:* \`${result.friendPassCodes[1]}\`\n\n` +
        `_(Válidos por 30 días · Un solo uso por código)_`
    }

    // WhatsApp al cliente pagador
    await sendWhatsAppMessage(
      payment.customer.phone,
      `✅ *¡Pago Aprobado en Caja!*\n\n🏋️ *${payment.tenant.name}*\n\n💵 ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}: *$${amount.toFixed(2)} USD*${prodLine}\n🎁 Cashback acreditado: *+$${cashbackAmt.toFixed(2)} USD* (${cashbackPct}%)\n💰 Tu nuevo saldo en Monedero: *$${result.newBalance.toFixed(2)} USD*${passesSection}\n\n¡Gracias por tu visita! Puedes canjear tu saldo acumulado en recepción. 💪`,
      instanceName
    )

    // WhatsApp al socio referente si aplica
    if (referrerCustomer && result.referrerBonusAmt > 0) {
      await sendWhatsAppMessage(
        referrerCustomer.phone,
        `🎉 *¡Felicitaciones, ${referrerCustomer.name}! Recompensa por Referido*\n\n🏋️ *${payment.tenant.name}*\n\nTu amigo *${payment.customer.name}* acaba de activar su mensualidad en el gimnasio indicando que tú lo referiste.\n\n🎁 *Bono Acreditado:* *+$${result.referrerBonusAmt.toFixed(2)} USD*\n💰 *Tu nuevo saldo en Monedero:* *$${result.referrerNewBalance.toFixed(2)} USD*\n\nPuedes canjear este saldo en tu próxima mensualidad o en la barra. ¡Gracias por recomendar a Titanus! 💪`,
        instanceName
      )
    }

    return NextResponse.json({ success: true, status: 'APPROVED', newBalance: result.newBalance })
  } catch (error: any) {
    console.error('Error al procesar aprobación de pago:', error)
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
