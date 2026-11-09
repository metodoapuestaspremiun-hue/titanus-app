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

    // 1. Identificar Tenant por la instancia de Evolution API
    const instanceName =
      body.instance ||
      body.instanceName ||
      data?.instance ||
      data?.instanceName ||
      null

    let tenant = null
    if (instanceName) {
      tenant = await prisma.tenant.findFirst({
        where: { evolutionInstanceName: instanceName },
      })
    }

    // Fallback retrocompatible para Titanus Gym
    if (!tenant) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: 'titanus-gym' },
      })
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no configurado' }, { status: 400 })
    }

    const evoInstance = tenant.evolutionInstanceName || 'gym_bot'

    // 2. Obtener o registrar cliente en este tenant
    let customer = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, phone },
      include: { wallets: { where: { tenantId: tenant.id } } },
    })

    const senderName = message.pushName || `Socio ${tenant.name}`
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
    } else if (customer.name.startsWith('Socio ') && message.pushName) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { name: message.pushName },
      })
      customer.name = message.pushName
    }

    const currentBalance = customer.wallets?.[0] ? Number(customer.wallets[0].balance) : 0

    // -------------------------------------------------------------
    // CONSULTA AUTÓNOMA DE SALDO: /saldo, saldo, billetera, etc.
    // -------------------------------------------------------------
    const isBalanceQuery = [
      '/saldo', 'saldo', 'mi saldo', 'cuanto tengo', 'cuanto tengo en mi wallet',
      'billetera', 'mi billetera', 'wallet', 'monedero', 'puntos', 'cashback'
    ].includes(lowerText)

    if (isBalanceQuery) {
      const msg = `💰 *TU BILLETERA DIGITAL - ${tenant.name.toUpperCase()}*\n\nHola *${customer.name}*!\n\n💵 Saldo disponible: *$${currentBalance.toFixed(2)} USD*\n\n🔥 Puedes canjear hasta el *100%* de este saldo en tu próxima mensualidad, batidos o suplementos en recepción.\n\n_Para canjear, solicítalo al staff en el mostrador._`
      await sendWhatsAppMessage(phone, msg, evoInstance)
      return NextResponse.json({ status: 'balance_sent', balance: currentBalance })
    }

    // -------------------------------------------------------------
    // INTERACTIVIDAD PASO A: SELECCIÓN DE SUCURSAL / SEDE (MULTI-SEDE)
    // -------------------------------------------------------------
    const pendingBranchSelection = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'BRANCH_SELECTION',
        token: { startsWith: `BRANCH_SEL_${phone}|` },
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingBranchSelection && /^\d+$/.test(rawText)) {
      const branches = await prisma.branch.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      })

      const branchIdx = parseInt(rawText) - 1
      if (branchIdx >= 0 && branchIdx < branches.length) {
        const chosenBranch = branches[branchIdx]
        const originalAction = pendingBranchSelection.token.split('|ACTION:')[1] || 'MEM'

        // Borrar sesión de selección de sede
        await prisma.qrToken.deleteMany({
          where: { tenantId: tenant.id, token: { startsWith: `BRANCH_SEL_${phone}|` } },
        })

        // Continuar hacia el flujo solicitado con la sede ya elegida
        return await dispatchBranchFlow(tenant, customer, phone, evoInstance, chosenBranch, originalAction, currentBalance)
      } else {
        await sendWhatsAppMessage(
          phone,
          `⚠️ Número de sede inválido. Por favor responde con un número del 1 al ${branches.length}.`,
          evoInstance
        )
        return NextResponse.json({ status: 'invalid_branch_index' })
      }
    }

    // -------------------------------------------------------------
    // INTERACTIVIDAD PASO B: CALIFICACIÓN DE COACHES (SELECCIÓN DE COACH)
    // -------------------------------------------------------------
    const pendingCoachSelection = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'EVAL_SELECT_COACH',
        token: { startsWith: `EVAL_COACH_SEL_${phone}` },
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingCoachSelection && /^\d+$/.test(rawText)) {
      const branchIdInToken = pendingCoachSelection.token.split('|BRANCH:')[1] || null
      const whereCoaches: any = { tenantId: tenant.id, isActive: true }
      if (branchIdInToken) {
        whereCoaches.branchId = branchIdInToken
      }

      const coaches = await prisma.staff.findMany({
        where: whereCoaches,
        orderBy: { name: 'asc' },
      })

      const index = parseInt(rawText) - 1
      if (index >= 0 && index < coaches.length) {
        const chosenCoach = coaches[index]

        // Restricción antispam: 1 calificación al mismo coach cada 7 días
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
            `⏳ *Límite de Evaluación Alcanzado*\n\nHola ${customer.name}, ya calificaste a *${chosenCoach.name}* en los últimos 7 días. Para mantener un podio justo, se permite una calificación por coach por semana.\n\n¡Gracias por tu apoyo continuo! 💪`,
            evoInstance
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
            token: `EVAL_STARS_${phone}|COACH:${chosenCoach.id}|BRANCH:${branchIdInToken || ''}`,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })

        const msg = `⭐ *CALIFICANDO A ${chosenCoach.name.toUpperCase()}*\n\n¿Cuántas estrellas le das a su entrenamiento de hoy?\n\nResponde únicamente con un número del *1 al 5*:\n\n⭐ 1 = Muy insatisfecho\n⭐⭐ 2 = Regular\n⭐⭐⭐ 3 = Bueno\n⭐⭐⭐⭐ 4 = Muy bueno\n⭐⭐⭐⭐⭐ 5 = ¡Excelente!`
        await sendWhatsAppMessage(phone, msg, evoInstance)
        return NextResponse.json({ status: 'waiting_stars', coach: chosenCoach.name })
      }
    }

    // -------------------------------------------------------------
    // INTERACTIVIDAD PASO C: CALIFICACIÓN - ASIGNACIÓN DE ESTRELLAS
    // -------------------------------------------------------------
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
      const parts = pendingStars.token.split('|')
      const coachPart = parts.find((p) => p.startsWith('COACH:'))
      const coachId = coachPart ? coachPart.replace('COACH:', '') : ''

      if (coachId) {
        let createdEvalId: string | null = null

        const createdEval = await prisma.evaluation.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            staffId: coachId,
            stars,
          },
        })
        createdEvalId = createdEval.id

        await prisma.qrToken.deleteMany({
          where: { tenantId: tenant.id, token: { startsWith: `EVAL_STARS_${phone}` } },
        })

        if (stars === 5) {
          const googleUrl = tenant.googleReviewUrl || 'https://maps.google.com'
          await sendWhatsAppMessage(
            phone,
            `🎉 *¡Muchas gracias por tus 5 estrellas!*\n\nTu valoración nos impulsa a seguir dándolo todo.\n\n⭐ ¿Nos ayudarías compartiendo tu reseña en Google? Solo te tomará 10 segundos:\n👉 ${googleUrl}\n\n¡Te esperamos en tu próxima rutina! 💪🔥`,
            evoInstance
          )
          return NextResponse.json({ status: 'evaluation_5_stars_completed' })
        } else {
          if (createdEvalId) {
            await prisma.qrToken.create({
              data: {
                tenantId: tenant.id,
                type: 'EVAL_WAITING_COMMENT',
                token: `EVAL_COMMENT_${phone}|EVAL:${createdEvalId}`,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
              },
            })
          }

          await sendWhatsAppMessage(
            phone,
            `🙏 *Gracias por tus ${stars} estrellas.*\n\nQueremos que tu experiencia sea siempre de 5 estrellas. ¿Qué podríamos mejorar o qué sucedió en tu entrenamiento?\n\n_Escribe tu comentario en el siguiente mensaje (o responde "No" si prefieres no comentar):_`,
            evoInstance
          )
          return NextResponse.json({ status: 'waiting_feedback_comment' })
        }
      }
    }

    // -------------------------------------------------------------
    // INTERACTIVIDAD PASO D: COMENTARIO DE FEEDBACK (1-4 ESTRELLAS)
    // -------------------------------------------------------------
    const pendingComment = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'EVAL_WAITING_COMMENT',
        token: { startsWith: `EVAL_COMMENT_${phone}` },
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingComment && rawText.trim().length > 0) {
      const evalId = pendingComment.token.split('|EVAL:')[1] || ''
      if (evalId) {
        await prisma.evaluation.update({
          where: { id: evalId },
          data: { comment: rawText.trim() },
        })
      }

      await prisma.qrToken.deleteMany({
        where: { tenantId: tenant.id, token: { startsWith: `EVAL_COMMENT_${phone}` } },
      })

      await sendWhatsAppMessage(
        phone,
        `✅ *Comentario recibido.*\n\nMuchas gracias, ${customer.name}. Tu mensaje ha sido registrado internamente para la gerencia de *${tenant.name}*. Nos ayuda a mejorar el servicio día a día. 💪`,
        evoInstance
      )
      return NextResponse.json({ status: 'comment_recorded', evalId })
    }

    // -------------------------------------------------------------
    // INTERACTIVIDAD PASO E: SELECCIÓN DE PLAN DE MENSUALIDAD (CON SUCURSAL)
    // -------------------------------------------------------------
    const pendingPlanSelection = await prisma.qrToken.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'PLAN_SELECTION',
        token: { startsWith: `PLAN_SEL_${phone}` },
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingPlanSelection && /^\d+$/.test(rawText)) {
      const branchIdInToken = pendingPlanSelection.token.split('|BRANCH:')[1] || null
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

        // Crea pago con branchId asignado para que aparezca exclusivamente en la caja de esa sede
        await prisma.payment.create({
          data: {
            tenantId: tenant.id,
            branchId: branchIdInToken,
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
          `✅ *Plan Seleccionado: ${chosenPlan.name}*\n\n💵 Monto a pagar en caja: *$${amount.toFixed(2)} USD*\n🎁 Cashback que ganarás: *+$${cashbackAmt.toFixed(2)} USD* (${cashbackPct}%)\n💰 Saldo actual en tu Monedero: *$${currentBalance.toFixed(2)} USD*\n\n🔔 *Acércate a recepción para cancelar.* Una vez que el staff apruebe tu pago en el monitor, tu saldo de cashback se acreditará automáticamente.`,
          evoInstance
        )
        return NextResponse.json({ status: 'plan_payment_queued', plan: chosenPlan.name })
      }
    }

    // -------------------------------------------------------------
    // ENTRADA DE COMANDOS QR: MEM, RET, EVAL (CON SUFIJO O GENÉRICOS)
    // -------------------------------------------------------------
    const match = rawText.match(/(MEM-[A-Z0-9-]+|RET-[A-Z0-9-]+|EVAL-[A-Z0-9-]+|\bMEM\b|\bRET\b|\bEVAL\b)/i)
    const tokenExtracted = match ? match[1].toUpperCase() : rawText.trim().toUpperCase()

    const isQrCommand = tokenExtracted.startsWith('EVAL') || tokenExtracted.startsWith('MEM') || tokenExtracted.startsWith('RET')
    if (!isQrCommand) {
      return NextResponse.json({ status: 'not_club_command' })
    }

    // -------------------------------------------------------------
    // CONSUMO ATÓMICO DEL TOKEN QR (SEGURIDAD ANTIFRAUDE & ANTISPAM)
    // -------------------------------------------------------------
    // Si viene un token generado (ej: MEM-SUR-7X9B o MEM-8F2K), se valida su existencia y tiempo de vida
    const isPermanentBareCommand = tokenExtracted === 'MEM' || tokenExtracted === 'RET' || tokenExtracted === 'EVAL'

    if (!isPermanentBareCommand) {
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
          `⚠️ *Código QR no válido o ya utilizado*\n\nEste código ya fue consumido o su tiempo de escaneo expiró (3 minutos). Por favor vuelve a escanear el cartel oficial en la recepción del gimnasio.`,
          evoInstance
        )
        return NextResponse.json({ status: 'qr_expired_or_invalid' })
      }

      // Quemar el token inmediatamente de la base de datos (Un solo uso garantizado)
      await prisma.qrToken.delete({ where: { id: validQr.id } })
    }

    // Determinar la acción base: EVAL, MEM o RET
    let actionType = 'MEM'
    if (tokenExtracted.startsWith('EVAL')) actionType = 'EVAL'
    else if (tokenExtracted.startsWith('RET')) actionType = 'RET'

    // Obtener las sucursales del gimnasio
    const branches = await prisma.branch.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    })

    // Detectar si el QR ya trae la sede en su código (ej: EVAL-SUR, MEM-CENTRO, RET-UTPL)
    let explicitBranch: any = null
    for (const b of branches) {
      if (tokenExtracted.includes(`-${b.code}`) || tokenExtracted.endsWith(b.code)) {
        explicitBranch = b
        break
      }
    }

    // Si el QR ya indica la sede de forma explícita, va directo a esa sede
    if (explicitBranch) {
      return await dispatchBranchFlow(tenant, customer, phone, evoInstance, explicitBranch, actionType, currentBalance)
    }

    // Si el gimnasio solo tiene 1 sucursal, va directo a la única sede
    if (branches.length <= 1) {
      const singleBranch = branches[0] || null
      return await dispatchBranchFlow(tenant, customer, phone, evoInstance, singleBranch, actionType, currentBalance)
    }

    // Si el gimnasio tiene 2 o más sucursales y el QR es genérico (ej. "MEM", "EVAL", "RET"),
    // se le pregunta al cliente en qué sede se encuentra
    let branchMenu = `📍 *¿EN QUÉ SEDE TE ENCUENTRAS HOY?*\n\n`
    branchMenu += `Hola *${customer.name}*! Para atenderte en la recepción correcta, responde con el número de tu sede:\n\n`

    branches.forEach((b, idx) => {
      const crown = b.isMain ? ' 👑 (Matriz)' : ''
      branchMenu += `*${idx + 1}.* Sede ${b.name}${crown}\n`
    })

    branchMenu += `\n_Responde solo con el número (ej: *1* o *2*)._`

    await sendWhatsAppMessage(phone, branchMenu, evoInstance)

    // Guardar sesión esperando que responda la sede
    await prisma.qrToken.deleteMany({
      where: { tenantId: tenant.id, token: { startsWith: `BRANCH_SEL_${phone}|` } },
    })
    await prisma.qrToken.create({
      data: {
        tenantId: tenant.id,
        type: 'BRANCH_SELECTION',
        token: `BRANCH_SEL_${phone}|ACTION:${actionType}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    return NextResponse.json({ status: 'branch_selection_prompted' })
  } catch (error: any) {
    console.error('Error en Webhook Club WhatsApp:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Función auxiliar para enrutar hacia el flujo de la sede escogida
async function dispatchBranchFlow(
  tenant: any,
  customer: any,
  phone: string,
  evoInstance: string,
  branch: any | null,
  actionType: string,
  currentBalance: number
) {
  const branchId = branch?.id || null
  const branchName = branch?.name || 'Centro'

  // FLUJO 1: CALIFICAR COACH (EVAL)
  if (actionType === 'EVAL') {
    const whereCoaches: any = { tenantId: tenant.id, isActive: true }
    if (branchId) {
      whereCoaches.branchId = branchId
    }

    const coaches = await prisma.staff.findMany({
      where: whereCoaches,
      orderBy: { name: 'asc' },
    })

    if (coaches.length === 0) {
      await sendWhatsAppMessage(
        phone,
        `❌ No hay entrenadores asignados a la *Sede ${branchName}* en este momento. Consulta en recepción.`,
        evoInstance
      )
      return NextResponse.json({ status: 'no_coaches_in_branch' })
    }

    let msg = `🏋️ *CALIFICA A TU ENTRENADOR - SEDE ${branchName.toUpperCase()}*\n\n`
    msg += `Responde con el *número* del coach que deseas calificar:\n\n`
    coaches.forEach((c, idx) => {
      msg += `*${idx + 1}.* ${c.name}\n`
    })
    msg += `\n_Ejemplo: Responde *1* para el primer entrenador._`

    await sendWhatsAppMessage(phone, msg, evoInstance)

    await prisma.qrToken.deleteMany({
      where: { tenantId: tenant.id, token: { startsWith: `EVAL_COACH_SEL_${phone}` } },
    })
    await prisma.qrToken.create({
      data: {
        tenantId: tenant.id,
        type: 'EVAL_SELECT_COACH',
        token: `EVAL_COACH_SEL_${phone}|BRANCH:${branchId || ''}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    return NextResponse.json({ status: 'coaches_listed', branch: branchName })
  }

  // FLUJO 2: PAGO DE MENSUALIDAD (MEM)
  if (actionType === 'MEM') {
    const plans = await prisma.membershipPlan.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { price: 'asc' },
    })

    let msg = `📋 *PLANES DE MENSUALIDAD - SEDE ${branchName.toUpperCase()}*\n\n`
    msg += `Hola *${customer.name}*! Responde con el *número* del plan que deseas abonar en caja:\n\n`

    plans.forEach((p, idx) => {
      const cashbackEst = ((Number(p.price) * Number(tenant.referralCommPct)) / 100).toFixed(2)
      msg += `*${idx + 1}.* ${p.name} — *$${Number(p.price).toFixed(2)} USD*\n   └ 🎁 Ganas *$${cashbackEst} USD* de Cashback\n\n`
    })
    msg += `_Responde con el número de tu plan (ej: *1* o *2*)._`

    await sendWhatsAppMessage(phone, msg, evoInstance)

    await prisma.qrToken.deleteMany({
      where: { tenantId: tenant.id, token: { startsWith: `PLAN_SEL_${phone}` } },
    })
    await prisma.qrToken.create({
      data: {
        tenantId: tenant.id,
        type: 'PLAN_SELECTION',
        token: `PLAN_SEL_${phone}|BRANCH:${branchId || ''}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    return NextResponse.json({ status: 'plans_listed', branch: branchName })
  }

  // FLUJO 3: TIENDA RETAIL / BARRA (RET)
  if (actionType === 'RET') {
    const cashbackPct = Number(tenant.storeReferralCommPct)

    // Registra pago en estado PENDING con el branchId de la sede
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        branchId,
        customerId: customer.id,
        type: 'RETAIL',
        amount: 0,
        cashbackPct,
        cashbackAmt: 0,
        status: 'PENDING',
        description: `Consumo en Barra de Suplementos · Sede ${branchName}`,
      },
    })

    await sendWhatsAppMessage(
      phone,
      `🥤 *COMPRA EN BARRA - SEDE ${branchName.toUpperCase()}*\n\nHola *${customer.name}*!\n\nTu consumo fue enviado al monitor de recepción de la *Sede ${branchName}*. El staff confirmará el monto de tus productos y una vez aprobado, se acreditará tu *${cashbackPct}% de Cashback* a tu Billetera Digital.\n\n💰 Saldo actual: *$${currentBalance.toFixed(2)} USD*`,
      evoInstance
    )

    return NextResponse.json({ status: 'retail_queued', branch: branchName })
  }

  return NextResponse.json({ status: 'ok' })
}
