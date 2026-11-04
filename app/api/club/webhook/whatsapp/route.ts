import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { event, data } = body

    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      return NextResponse.json({ status: 'ignored' })
    }

    const message = data?.message || data?.key ? data : null
    if (!message || message.key?.fromMe) {
      return NextResponse.json({ status: 'ignored_from_me' })
    }

    const remoteJid = message.key?.remoteJid || ''
    if (remoteJid.includes('@g.us')) {
      return NextResponse.json({ status: 'ignored_group' })
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
    const rawText = (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      ''
    ).trim()
    const lowerText = rawText.toLowerCase()

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    if (!tenant) return NextResponse.json({ error: 'Tenant no configurado' }, { status: 400 })

    // Obtener o registrar cliente de fidelización
    let customer = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, phone },
      include: { wallets: true },
    })

    const senderName = message.pushName || 'Socio Titanus'
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          name: senderName,
          phone,
          wallets: { create: { tenantId: tenant.id, balance: 0 } },
        },
        include: { wallets: true },
      })
    } else if (customer.name === 'Socio Titanus' && message.pushName) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { name: message.pushName },
      })
    }

    const currentBalance = customer.wallets?.[0] ? Number(customer.wallets[0].balance) : 0

    // -------------------------------------------------------------
    // CONSULTA AUTÓNOMA DE SALDO: /saldo, saldo, billetera, etc. (SIN APROBACIÓN)
    // -------------------------------------------------------------
    const isBalanceQuery = [
      '/saldo', 'saldo', 'mi saldo', 'cuanto tengo', 'cuanto tengo en mi wallet',
      'billetera', 'mi billetera', 'wallet', 'monedero', 'puntos', 'cashback'
    ].includes(lowerText)

    if (isBalanceQuery) {
      const msg = `💰 *TU BILLETERA DIGITAL - TITANUS GYM*\n\nHola *${customer.name}*!\n\n💵 Saldo disponible: *$${currentBalance.toFixed(2)} USD*\n\n🔥 Puedes canjear hasta el *100%* de este saldo en tu próxima mensualidad, batidos o suplementos en recepción.\n\n_Para canjear, solicítalo al staff en el mostrador._`
      await sendWhatsAppMessage(phone, msg)
      return NextResponse.json({ status: 'balance_sent', balance: currentBalance })
    }

    // -------------------------------------------------------------
    // SESIONES INTERACTIVAS EN CURSO
    // -------------------------------------------------------------

    // A) Flujo 1: Calificación de Coaches - Selección de Coach
    const pendingCoachSelection = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'EVAL_SELECT_COACH',
        token: `EVAL_COACH_SEL_${phone}`,
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingCoachSelection && /^\d+$/.test(rawText)) {
      const index = parseInt(rawText) - 1
      const coaches = await prisma.staff.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { name: 'asc' },
      })

      if (index >= 0 && index < coaches.length) {
        const chosenCoach = coaches[index]

        // RESTRICCIÓN ANTISPAM: Máximo 1 evaluación al mismo coach cada 7 días por socio
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const recentEval = await prisma.evaluation.findFirst({
          where: {
            tenantId: tenant.id,
            customerId: customer.id,
            staffId: chosenCoach.id,
            createdAt: { gt: sevenDaysAgo },
          },
        })

        if (recentEval) {
          await prisma.qrToken.deleteMany({
            where: { tenantId: tenant.id, token: { startsWith: `EVAL_COACH_SEL_${phone}` } },
          })
          await sendWhatsAppMessage(
            phone,
            `⏳ *Límite de Evaluación Alcanzado*\n\nHola ${customer.name}, ya calificaste a *${chosenCoach.name}* en los últimos 7 días. Para mantener un podio justo, se permite una calificación por coach por semana.\n\n¡Gracias por tu apoyo continuo! 💪`
          )
          return NextResponse.json({ status: 'rate_limited' })
        }

        await prisma.qrToken.deleteMany({
          where: { tenantId: tenant.id, token: { startsWith: `EVAL_COACH_SEL_${phone}` } },
        })

        // Guardar sesión esperando estrellas
        await prisma.qrToken.create({
          data: {
            tenantId: tenant.id,
            type: 'EVAL_WAITING_STARS',
            token: `EVAL_STARS_${phone}|COACH:${chosenCoach.id}`,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })

        await sendWhatsAppMessage(
          phone,
          `Has seleccionado a *${chosenCoach.name}*.\n\n⭐ ¿Cuántas estrellas le das a su entrenamiento?\nResponde con un número del *1 al 5* (Donde 5 es Excelente).`
        )
        return NextResponse.json({ status: 'coach_selected', coach: chosenCoach.name })
      }
    }

    // B) Flujo 1: Calificación de Coaches - Envío de Estrellas (100% AUTÓNOMO, SIN APROBACIÓN)
    const pendingStars = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'EVAL_WAITING_STARS',
        token: { startsWith: `EVAL_STARS_${phone}` },
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingStars && /^[1-5]$/.test(rawText)) {
      const stars = parseInt(rawText)
      const coachId = pendingStars.token.split('|COACH:')[1] || ''

      if (coachId) {
        await prisma.evaluation.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            staffId: coachId,
            stars,
          },
        })
      }

      await prisma.qrToken.deleteMany({
        where: { tenantId: tenant.id, token: { startsWith: `EVAL_STARS_${phone}` } },
      })

      if (stars === 5) {
        const reviewUrl = tenant.googleReviewUrl || 'https://maps.google.com'
        await sendWhatsAppMessage(
          phone,
          `⭐ *¡Muchísimas gracias por tus 5 Estrellas, ${customer.name}!*\n\nTu opinión es vital para nuestro equipo Spartan. ¿Nos apoyarías dejando tu reseña en Google Maps con este enlace directo?\n👉 ${reviewUrl}\n\n¡A seguir entrenando con todo! 💪 *TITANUS GYM*`
        )
      } else {
        await sendWhatsAppMessage(
          phone,
          `🙏 *Gracias por tu feedback sincero, ${customer.name}.*\n\nEn Titanus queremos mejorar siempre. ¿Tienes alguna sugerencia o comentario sobre tu entrenamiento? Responde a este mensaje y la administración lo revisará.`
        )
      }
      return NextResponse.json({ status: 'evaluation_recorded', stars })
    }

    // C) Flujo 2: Selección de Plan de Mensualidad -> Envía a Cola de Recepción (REQUIERE APROBACIÓN)
    const pendingPlanSelection = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'PLAN_SELECTION',
        token: `PLAN_SEL_${phone}`,
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingPlanSelection && /^\d+$/.test(rawText)) {
      const index = parseInt(rawText) - 1
      const plans = await prisma.membershipPlan.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { price: 'asc' },
      })

      if (index >= 0 && index < plans.length) {
        const chosenPlan = plans[index]
        const amount = Number(chosenPlan.price)
        const cashbackPct = Number(tenant.referralCommPct)
        const cashbackAmt = parseFloat(((amount * cashbackPct) / 100).toFixed(2))

        await prisma.qrToken.deleteMany({
          where: { tenantId: tenant.id, token: { startsWith: `PLAN_SEL_${phone}` } },
        })

        // Crea pago con estado PENDING para que el recepcionista dé permiso
        await prisma.payment.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            type: 'MEMBERSHIP',
            amount,
            cashbackPct,
            cashbackAmt,
            status: 'PENDING',
            description: chosenPlan.name,
          },
        })

        await sendWhatsAppMessage(
          phone,
          `✅ *Plan Seleccionado: ${chosenPlan.name}*\n\n💵 Monto a pagar en caja: *$${amount.toFixed(2)} USD*\n🎁 Cashback que ganarás: *+$${cashbackAmt.toFixed(2)} USD* (${cashbackPct}%)\n💰 Saldo actual en tu Monedero: *$${currentBalance.toFixed(2)} USD*\n\n🔔 *Acércate a recepción para cancelar.* Una vez que el staff apruebe tu pago en el monitor, tu saldo de cashback se acreditará automáticamente.`
        )
        return NextResponse.json({ status: 'plan_payment_queued', plan: chosenPlan.name })
      }
    }

    // Extraer token si viene en formato "Hola, mi código es MEM-XXXX" o directamente "MEM-XXXX"
    const match = rawText.match(/(MEM-[A-Z0-9]+|RET-[A-Z0-9]+|EVAL-[A-Z0-9]+)/i)
    const tokenExtracted = match ? match[1].toUpperCase() : rawText

    // Si no es un comando de código QR, ignorar
    const isQrCommand = tokenExtracted.startsWith('EVAL-') || tokenExtracted.startsWith('MEM-') || tokenExtracted.startsWith('RET-')
    if (!isQrCommand) {
      return NextResponse.json({ status: 'not_club_command' })
    }

    // -------------------------------------------------------------
    // CONSUMO ATÓMICO DEL TOKEN QR (SEGURIDAD ANTIFRAUDE)
    // -------------------------------------------------------------
    const validQr = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        token: tokenExtracted,
        expiresAt: { gt: new Date() },
      },
    })

    if (!validQr) {
      await sendWhatsAppMessage(
        phone,
        `⚠️ *Código QR no válido o ya utilizado*\n\nEste código ya fue consumido o su tiempo de escaneo expiró. Por favor vuelve a escanear el cartel oficial en el gimnasio.`
      )
      return NextResponse.json({ status: 'qr_expired_or_invalid' })
    }

    // Quemar el token inmediatamente de la base de datos (Un solo uso)
    await prisma.qrToken.delete({ where: { id: validQr.id } })

    // -------------------------------------------------------------
    // FLUJO 1: CALIFICAR COACH (QR: EVAL-*) -> 100% AUTÓNOMO (NO REQUIERE APROBACIÓN)
    // -------------------------------------------------------------
    if (tokenExtracted.startsWith('EVAL-')) {
      const coaches = await prisma.staff.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { name: 'asc' },
      })

      if (coaches.length === 0) {
        await sendWhatsAppMessage(phone, `❌ No hay entrenadores registrados aún en el sistema. Consulta en recepción.`)
        return NextResponse.json({ status: 'no_coaches' })
      }

      let msg = `🏋️ *CALIFICA A TU ENTRENADOR - TITANUS GYM*\n\n`
      msg += `Responde con el *número* del coach que deseas calificar:\n\n`
      coaches.forEach((c, idx) => {
        msg += `*${idx + 1}.* ${c.name}\n`
      })
      msg += `\n_Ejemplo: Responde *1* para el primer entrenador._`

      await sendWhatsAppMessage(phone, msg)

      await prisma.qrToken.deleteMany({
        where: { tenantId: tenant.id, token: { startsWith: `EVAL_COACH_SEL_${phone}` } },
      })
      await prisma.qrToken.create({
        data: {
          tenantId: tenant.id,
          type: 'EVAL_SELECT_COACH',
          token: `EVAL_COACH_SEL_${phone}`,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      return NextResponse.json({ status: 'coaches_listed' })
    }

    // -------------------------------------------------------------
    // FLUJO 2: PAGO DE MENSUALIDAD (QR: MEM-*) -> REQUIERE APROBACIÓN EN CAJA
    // -------------------------------------------------------------
    if (tokenExtracted.startsWith('MEM-')) {
      const plans = await prisma.membershipPlan.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { price: 'asc' },
      })

      let msg = `📋 *PLANES DE MENSUALIDAD - TITANUS GYM*\n\n`
      msg += `Hola *${customer.name}*! Responde con el *número* del plan que deseas abonar:\n\n`

      plans.forEach((p, idx) => {
        const cashbackEst = ((Number(p.price) * Number(tenant.referralCommPct)) / 100).toFixed(2)
        msg += `*${idx + 1}.* ${p.name} — *$${Number(p.price).toFixed(2)} USD*\n   └ 🎁 Ganas *$${cashbackEst} USD* de Cashback\n\n`
      })
      msg += `_Responde con el número de tu plan (ej: *1* o *2*)._`

      await sendWhatsAppMessage(phone, msg)

      await prisma.qrToken.deleteMany({
        where: { tenantId: tenant.id, token: { startsWith: `PLAN_SEL_${phone}` } },
      })
      await prisma.qrToken.create({
        data: {
          tenantId: tenant.id,
          type: 'PLAN_SELECTION',
          token: `PLAN_SEL_${phone}`,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      return NextResponse.json({ status: 'plans_listed' })
    }

    // -------------------------------------------------------------
    // FLUJO 3: TIENDA RETAIL / BARRA (QR: RET-*) -> REQUIERE APROBACIÓN EN CAJA
    // -------------------------------------------------------------
    if (tokenExtracted.startsWith('RET-')) {
      const cashbackPct = Number(tenant.storeReferralCommPct)

      // Registra en caja con estado PENDING para que recepción ponga el monto y apruebe
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          type: 'RETAIL',
          amount: 0,
          cashbackPct,
          cashbackAmt: 0,
          status: 'PENDING',
          description: 'Consumo en Barra de Suplementos',
        },
      })

      await sendWhatsAppMessage(
        phone,
        `🥤 *COMPRA EN BARRA REGISTRADA*\n\nHola *${customer.name}*!\n\nTu consumo fue enviado al monitor de recepción. El staff confirmará el monto de tus productos y una vez aprobado, se acreditará tu *${cashbackPct}% de Cashback* a tu Billetera Digital.\n\n💰 Saldo actual: *$${currentBalance.toFixed(2)} USD*`
      )

      return NextResponse.json({ status: 'retail_queued' })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Error en Webhook Club WhatsApp:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
