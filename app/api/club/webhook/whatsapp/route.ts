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
    // Ignorar mensajes de grupos
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

    // Obtener o registrar cliente de fidelización con su número y nombre de WhatsApp
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
      // Actualizar nombre si antes era genérico
      await prisma.customer.update({
        where: { id: customer.id },
        data: { name: message.pushName },
      })
    }

    const currentBalance = customer.wallets?.[0] ? Number(customer.wallets[0].balance) : 0

    // -------------------------------------------------------------
    // CONSULTA RÁPIDA DE MONEDERO: /saldo, saldo, billetera, wallet, etc.
    // -------------------------------------------------------------
    const isBalanceQuery = [
      '/saldo', 'saldo', 'mi saldo', 'cuanto tengo', 'cuanto tengo en mi wallet',
      'billetera', 'mi billetera', 'wallet', 'monedero', 'puntos', 'cashback'
    ].includes(lowerText)

    if (isBalanceQuery) {
      const msg = `💰 *TU BILLETERA DIGITAL - TITANUS GYM*\n\nHola *${customer.name}*!\n\n💵 Saldo disponible: *$${currentBalance.toFixed(2)} USD*\n\n🔥 Puedes canjear hasta el *100%* de este saldo en tu próxima mensualidad, batidos o suplementos en recepción.\n\n_Para pagar o calificar, escanea los códigos QR en mostrador._`
      await sendWhatsAppMessage(phone, msg)
      return NextResponse.json({ status: 'balance_sent', balance: currentBalance })
    }

    // -------------------------------------------------------------
    // GESTIÓN DE SESIONES CONVERSACIONALES ACTIVAS
    // -------------------------------------------------------------
    // 1. Sesión activa: Selección de Coach para calificar
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

    // 2. Sesión activa: Calificación de estrellas (1 al 5)
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
          `🙏 *Gracias por tu feedback honesto, ${customer.name}.*\n\nEn Titanus queremos mejorar siempre. ¿Tienes alguna sugerencia o comentario sobre tu entrenamiento? Responde a este mensaje y la administración lo revisará.`
        )
      }
      return NextResponse.json({ status: 'evaluation_recorded', stars })
    }

    // 3. Sesión activa: Selección de Plan de Mensualidad
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

        // Eliminar sesión de selección
        await prisma.qrToken.deleteMany({
          where: { tenantId: tenant.id, token: { startsWith: `PLAN_SEL_${phone}` } },
        })

        // Crear la solicitud pendiente para caja en el panel
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
          `✅ *Plan Seleccionado: ${chosenPlan.name}*\n\n💵 Monto a pagar en caja: *$${amount.toFixed(2)} USD*\n🎁 Cashback que ganarás: *+$${cashbackAmt.toFixed(2)} USD* (${cashbackPct}%)\n💰 Saldo actual en tu Monedero: *$${currentBalance.toFixed(2)} USD*\n\n🔔 *Acércate a recepción para pagar.* El staff aprobará tu pago en el monitor y se acreditará tu saldo inmediatamente.`
        )
        return NextResponse.json({ status: 'plan_payment_queued', plan: chosenPlan.name })
      }
    }

    // Si no es un comando QR, salir para no interferir con otros bots
    const isQrCommand = rawText.startsWith('EVAL-') || rawText.startsWith('MEM-') || rawText.startsWith('RET-')
    if (!isQrCommand) {
      return NextResponse.json({ status: 'not_club_command' })
    }

    // -------------------------------------------------------------
    // VALIDACIÓN ANTIFRAUDE DEL TOKEN QR (EVITA REPETICIONES Y REUSO)
    // -------------------------------------------------------------
    // Buscar si el token existe y sigue vigente
    const validQr = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        token: rawText,
        expiresAt: { gt: new Date() },
      },
    })

    if (!validQr && (rawText.startsWith('MEM-') || rawText.startsWith('RET-') || rawText.startsWith('EVAL-'))) {
      // El QR ya fue usado o expiró
      await sendWhatsAppMessage(
        phone,
        `⚠️ *Código QR no válido o expirado*\n\nEste código ya fue utilizado o ha vencido. Por favor solicita en recepción que proyecten un nuevo código en pantalla.`
      )
      return NextResponse.json({ status: 'qr_expired_or_invalid' })
    }

    // Si el QR es válido, lo consumimos para que no se vuelva a usar
    if (validQr) {
      await prisma.qrToken.delete({ where: { id: validQr.id } })
    }

    // -------------------------------------------------------------
    // FLUJO 1: EVALUACIÓN DE COACHES (QR: EVAL-XXXX)
    // -------------------------------------------------------------
    if (rawText.startsWith('EVAL-')) {
      const coaches = await prisma.staff.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { name: 'asc' },
      })

      if (coaches.length === 0) {
        await sendWhatsAppMessage(phone, `❌ No hay entrenadores registrados aún. Consulta en recepción.`)
        return NextResponse.json({ status: 'no_coaches' })
      }

      let msg = `🏋️ *CALIFICA A TU ENTRENADOR - TITANUS GYM*\n\n`
      msg += `Responde con el *número* del coach que deseas calificar:\n\n`
      coaches.forEach((c, idx) => {
        msg += `*${idx + 1}.* ${c.name}\n`
      })
      msg += `\n_Ejemplo: Responde *1* para el primer entrenador._`

      await sendWhatsAppMessage(phone, msg)

      // Guardar sesión esperando selección de coach
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
    // FLUJO 2: PAGO DE MENSUALIDAD (QR: MEM-XXXX) -> LISTAR PLANES
    // -------------------------------------------------------------
    if (rawText.startsWith('MEM-')) {
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

      // Guardar sesión de selección de plan
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
    // FLUJO 3: TIENDA RETAIL / BARRA (QR: RET-XXXX)
    // -------------------------------------------------------------
    if (rawText.startsWith('RET-')) {
      const cashbackPct = Number(tenant.storeReferralCommPct)

      // Registrar la solicitud en caja (monto inicial $0 para que recepción lo confirme)
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
        `🥤 *COMPRA EN BARRA REGISTRADA*\n\nHola *${customer.name}*!\n\nTu consumo fue enviado al monitor de recepción. El staff confirmará el monto de tus productos y se acreditará tu *${cashbackPct}% de Cashback* a tu Billetera Digital.\n\n💰 Saldo actual: *$${currentBalance.toFixed(2)} USD*`
      )

      return NextResponse.json({ status: 'retail_queued' })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Error en Webhook Club WhatsApp:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
