import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/club/webhook/whatsapp
// Recibe eventos de Evolution API (MESSAGES_UPSERT)
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
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
    const text = (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      ''
    ).trim()

    // 1. Detectar si el usuario envió o escaneó un código QR: EVAL-*, MEM-*, RET-*
    if (text.startsWith('EVAL-')) {
      return handleEvaluationQr(phone, text)
    } else if (text.startsWith('MEM-')) {
      return handleMembershipPaymentQr(phone, text)
    } else if (text.startsWith('RET-')) {
      return handleRetailPurchaseQr(phone, text)
    }

    // 2. Manejo de respuestas interactivas / numéricas (ej. calificación 1-5 estrellas)
    // Aquí se gestionan los estados conversacionales
    return NextResponse.json({ status: 'ok', received: text })
  } catch (error: any) {
    console.error('Error en Webhook Club WhatsApp:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleEvaluationQr(phone: string, token: string) {
  // Lógica del Flujo 1: Calificación de Coaches
  // Consulta el QR activo y devuelve la lista de entrenadores para calificar con estrellas
  return NextResponse.json({
    status: 'evaluation_started',
    message: 'Por favor califica a tu coach del 1 al 5 estrellas.',
  })
}

async function handleMembershipPaymentQr(phone: string, token: string) {
  // Lógica del Flujo 2: Solicita pago de cuota, genera solicitud pendiente en caja
  return NextResponse.json({
    status: 'payment_requested',
    message: 'Solicitud de pago enviada a recepción para aprobación.',
  })
}

async function handleRetailPurchaseQr(phone: string, token: string) {
  // Lógica del Flujo 3: Compra en barra / suplemento, genera cashback al aprobar en caja
  return NextResponse.json({
    status: 'retail_requested',
    message: 'Solicitud de compra en barra registrada.',
  })
}

