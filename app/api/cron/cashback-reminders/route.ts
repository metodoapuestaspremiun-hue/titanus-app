import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'

export const dynamic = 'force-dynamic'

/**
 * Endpoint para ejecución de Cron Job diario (desde cPanel, Vercel Cron, etc.)
 * Valida los clientes con saldo de cashback a favor y envía exactamente 2 recordatorios:
 * - A los 15 días antes de que expire el cashback
 * - A los 3 días antes de que expire el cashback
 * Incluye deduplicación en WalletTransaction para evitar duplicidad de envíos.
 */
export async function GET(req: NextRequest) {
  return handleCron(req)
}

export async function POST(req: NextRequest) {
  return handleCron(req)
}

async function handleCron(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '')

    const CRON_SECRET = process.env.CRON_SECRET || 'titanus_cron_secure_key_2026'

    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()

    // 1. Obtener todos los clientes con billetera y balance positivo
    const wallets = await prisma.wallet.findMany({
      where: {
        balance: { gt: 0 },
        customer: {
          membershipExpiry: { not: null },
        },
      },
      include: {
        customer: true,
        tenant: true,
        transactions: {
          where: {
            type: 'NOTIFICATION_SENT',
          },
        },
      },
    })

    const results = {
      evaluated: wallets.length,
      sent15Days: 0,
      sent3Days: 0,
      errors: 0,
      details: [] as string[],
    }

    for (const wallet of wallets) {
      const customer = wallet.customer
      const tenant = wallet.tenant
      if (!customer.membershipExpiry) continue

      // Cashback dura: membresía pagada + 30 días de gracia
      const expiry = new Date(customer.membershipExpiry)
      const cashbackDeadline = new Date(expiry.getTime() + 30 * 24 * 60 * 60 * 1000)

      const diffMs = cashbackDeadline.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      // Solo nos interesa exactamente cuando restan 15 o 3 días
      let targetTier: '15_DAYS' | '3_DAYS' | null = null
      if (daysRemaining === 15) targetTier = '15_DAYS'
      else if (daysRemaining === 3) targetTier = '3_DAYS'

      if (!targetTier) continue

      // Verificar si ya se envió el recordatorio de este nivel
      const referenceId = `CASHBACK_EXPIRY_${targetTier}_${expiry.toISOString().split('T')[0]}`
      const alreadySent = wallet.transactions.some((tx: any) => tx.referenceId === referenceId)

      if (alreadySent) {
        continue
      }

      // Preparar mensaje de WhatsApp
      const gymName = tenant?.name || 'Titanus Gym'
      const customerName = customer.name.split(' ')[0]
      const balanceStr = Number(wallet.balance).toFixed(2)

      let message = ''
      if (targetTier === '15_DAYS') {
        message = `🔔 ¡Hola *${customerName}*! Te recordamos desde *${gymName}* que tienes un saldo a favor de *$${balanceStr} USD* en cashback en tu billetera digital.\n\n⏳ Le quedan *15 días* antes de su vencimiento. Puedes aprovecharlo al renovar tu membresía en recepción o usarlo en la tienda.\n\n¡Te esperamos en el gym para seguir entrenando fuerte! 💪🔥`
      } else {
        message = `⚠️ ¡Última oportunidad, *${customerName}*! Desde *${gymName}* queremos avisarte que te quedan solo *3 días* para usar tus *$${balanceStr} USD* de cashback.\n\nRenueva tu membresía o acércate a recepción antes de que expire. ¡No pierdas tu beneficio acumulado! 🏋️‍♂️✨`
      }

      // Enviar WhatsApp respetando el bot configurado
      const instance = tenant?.whatsappPhone || process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot'
      const sendRes = await sendWhatsAppMessage(customer.phone, message, instance)

      if (sendRes.success) {
        // Registrar transacción de deduplicación
        await prisma.walletTransaction.create({
          data: {
            tenantId: wallet.tenantId,
            walletId: wallet.id,
            type: 'NOTIFICATION_SENT',
            amount: 0,
            description: `Recordatorio de expiración de cashback (${targetTier === '15_DAYS' ? '15 días' : '3 días'})`,
            referenceId: referenceId,
          },
        })

        if (targetTier === '15_DAYS') results.sent15Days++
        else results.sent3Days++

        results.details.push(`Enviado a ${customer.name} (${customer.phone}) - ${targetTier}`)

        // Pequeño delay de 1.5s entre mensajes para protección anti-ban
        await new Promise(resolve => setTimeout(resolve, 1500))
      } else {
        results.errors++
        results.details.push(`Fallo al enviar a ${customer.name} (${customer.phone}): ${sendRes.error}`)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error: any) {
    console.error('Error en cron de cashback:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

