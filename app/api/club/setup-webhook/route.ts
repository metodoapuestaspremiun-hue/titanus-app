import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// POST /api/club/setup-webhook: Registra el webhook de fidelización en Evolution API para el tenant
export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const body = await req.json().catch(() => ({}))
    const { webhookUrl } = body

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    const EVOLUTION_API_URL =
      tenant?.evolutionApiUrl ||
      process.env.EVOLUTION_API_URL ||
      'http://178.238.238.158:8080'
    const EVOLUTION_API_KEY =
      tenant?.evolutionApiKey ||
      process.env.EVOLUTION_API_KEY ||
      '42a447c1-3d74-4b52-9571-042c174f7621'
    const EVOLUTION_INSTANCE =
      tenant?.evolutionInstanceName ||
      process.env.EVOLUTION_INSTANCE_NAME ||
      'gym_bot'

    const targetWebhookUrl =
      webhookUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/club/webhook/whatsapp`

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

    const result = await response.json().catch(() => null)

    return NextResponse.json({
      success: response.ok,
      webhookUrl: targetWebhookUrl,
      evolutionInstance: EVOLUTION_INSTANCE,
      evolutionResponse: result,
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
