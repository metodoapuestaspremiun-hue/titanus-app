import { NextResponse } from 'next/server'

// POST /api/club/setup-webhook: Registra el webhook de fidelización en Evolution API
// Llamar esto una vez desde Postman o desde /club/configuracion
export async function POST(req: Request) {
  try {
    const { webhookUrl } = await req.json()

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://129.153.116.213:8080'
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
    const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot'

    const targetWebhookUrl = webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/club/webhook/whatsapp`

    const response = await fetch(
      `${EVOLUTION_API_URL}/webhook/set/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetWebhookUrl,
          enabled: true,
          events: ['MESSAGES_UPSERT'],
          webhook_by_events: false,
        }),
      }
    )

    const result = await response.json()

    return NextResponse.json({
      success: response.ok,
      webhookUrl: targetWebhookUrl,
      evolutionResponse: result,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

