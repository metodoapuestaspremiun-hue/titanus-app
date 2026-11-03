import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Esta ruta es la que se imprime en los carteles físicos:
// /qr/m -> Mensualidad
// /qr/t -> Tienda / Barra Retail
// /qr/c -> Calificar Coach

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params
    const typeUpper = (type || '').toLowerCase()

    let qrType = 'MEMBERSHIP'
    let prefix = 'MEM'

    if (typeUpper === 't' || typeUpper === 'tienda' || typeUpper === 'retail') {
      qrType = 'RETAIL'
      prefix = 'RET'
    } else if (typeUpper === 'c' || typeUpper === 'coach' || typeUpper === 'eval') {
      qrType = 'EVALUATION'
      prefix = 'EVAL'
    } else if (typeUpper === 'm' || typeUpper === 'mensualidad') {
      qrType = 'MEMBERSHIP'
      prefix = 'MEM'
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    if (!tenant) {
      return new Response('Gimnasio no configurado', { status: 404 })
    }

    // 1. Generar token único criptográfico efímero
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase()
    const token = `${prefix}-${randomSuffix}`

    // 2. Guardar en la tabla QrToken con tiempo de vida (TTL) de 120 segundos (2 minutos)
    const expiresAt = new Date(Date.now() + 120 * 1000)

    await prisma.qrToken.create({
      data: {
        tenantId: tenant.id,
        type: qrType,
        token: token,
        expiresAt: expiresAt,
      },
    })

    // 3. Obtener el número real de WhatsApp configurado o consultarlo en vivo a Evolution API
    let whatsappPhone = tenant.whatsappPhone

    if (!whatsappPhone) {
      try {
        const evoUrl = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080'
        const evoKey = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621'
        const evoInst = process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot'

        const evoRes = await fetch(`${evoUrl}/instance/fetchInstances`, {
          headers: { apikey: evoKey },
        })
        const instances = await evoRes.json()
        const target = Array.isArray(instances)
          ? instances.find((i: any) => i.name === evoInst)
          : instances?.value?.find((i: any) => i.name === evoInst)

        if (target && target.ownerJid) {
          whatsappPhone = target.ownerJid.split('@')[0].replace(/[^0-9]/g, '')
          // Guardar en base de datos para no tener que consultarlo cada vez
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { whatsappPhone },
          })
        }
      } catch (err) {
        console.error('No se pudo obtener el número de Evolution API automáticamente:', err)
      }
    }

    const finalPhone = whatsappPhone || '593987654321'
    const waUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(token)}`

    return NextResponse.redirect(waUrl, 302)
  } catch (error) {
    console.error('Error en redirección de QR dinámico:', error)
    return new Response('Error procesando el escaneo', { status: 500 })
  }
}

