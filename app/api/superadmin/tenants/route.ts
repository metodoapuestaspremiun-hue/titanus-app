import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSuperAdminFromRequest } from '@/lib/auth'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// GET /api/superadmin/tenants: Retorna estadísticas SaaS y lista de todos los tenants
export async function GET(req: Request) {
  try {
    await getSuperAdminFromRequest(req)

    const [
      totalTenants,
      activeTenants,
      moduleFidelizacionCount,
      moduleMensajeriaCount,
      tenants,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.tenant.count({ where: { moduleFidelizacion: true } }),
      prisma.tenant.count({ where: { moduleMensajeria: true } }),
      prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              customers: true,
              staff: true,
              payments: true,
              evaluations: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalTenants,
        activeTenants,
        moduleFidelizacionCount,
        moduleMensajeriaCount,
      },
      tenants,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('No autorizado') ? 401 : 500 }
    )
  }
}

// POST /api/superadmin/tenants: Crear nuevo tenant / gimnasio SaaS
export async function POST(req: Request) {
  try {
    await getSuperAdminFromRequest(req)
    const body = await req.json()

    const {
      name,
      slug: customSlug,
      ownerEmail,
      ownerPassword,
      plan = 'PRO',
      moduleFidelizacion = true,
      moduleMensajeria = true,
      evolutionInstanceName,
      evolutionApiUrl,
      evolutionApiKey,
      primaryColor = '#00F5D4',
      secondaryColor = '#00E5FF',
      logoUrl,
      whatsappPhone,
      googleReviewUrl,
      referralCommPct = 10,
      storeReferralCommPct = 5,
    } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del gimnasio es obligatorio' },
        { status: 400 }
      )
    }

    const finalSlug = (customSlug?.trim() ? slugify(customSlug) : slugify(name)) || `gym-${Date.now()}`

    // Validar unicidad de slug
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: finalSlug },
    })
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: `El slug '${finalSlug}' ya se encuentra registrado` },
        { status: 400 }
      )
    }

    // Validar unicidad de email si fue ingresado
    if (ownerEmail?.trim()) {
      const existingEmail = await prisma.tenant.findUnique({
        where: { ownerEmail: ownerEmail.trim().toLowerCase() },
      })
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: `El correo '${ownerEmail}' ya está asignado a otro gimnasio` },
          { status: 400 }
        )
      }
    }

    // Hash de contraseña si fue provista
    let ownerPasswordHash: string | null = null
    if (ownerPassword?.trim()) {
      ownerPasswordHash = crypto
        .createHash('sha256')
        .update(ownerPassword.trim())
        .digest('hex')
    }

    // Instancia de Evolution API: si no se especifica nombre, se autogenera con el slug del gimnasio
    const cleanedInstance = evolutionInstanceName?.trim() || `gym_${finalSlug.replace(/[^a-zA-Z0-9_]/g, '_')}`

    // Crear Tenant en base de datos
    const createdTenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        ownerEmail: ownerEmail?.trim().toLowerCase() || null,
        ownerPasswordHash,
        plan,
        moduleFidelizacion: Boolean(moduleFidelizacion),
        moduleMensajeria: Boolean(moduleMensajeria),
        evolutionInstanceName: cleanedInstance,
        evolutionApiUrl: evolutionApiUrl?.trim() || null,
        evolutionApiKey: evolutionApiKey?.trim() || null,
        primaryColor: primaryColor?.trim() || '#00F5D4',
        secondaryColor: secondaryColor?.trim() || '#00E5FF',
        logoUrl: logoUrl?.trim() || null,
        whatsappPhone: whatsappPhone?.trim() || null,
        googleReviewUrl: googleReviewUrl?.trim() || null,
        referralCommPct: Number(referralCommPct) || 10,
        storeReferralCommPct: Number(storeReferralCommPct) || 5,
      },
    })

    // Intentar autoprovisionar instancia en Evolution API si se proporcionó instanceName
    let evolutionCreated = false
    if (cleanedInstance) {
      try {
        const evoUrl =
          evolutionApiUrl?.trim() ||
          process.env.EVOLUTION_API_URL ||
          'http://178.238.238.158:8080'
        const evoKey =
          evolutionApiKey?.trim() ||
          process.env.EVOLUTION_API_KEY ||
          '42a447c1-3d74-4b52-9571-042c174f7621'

        const evoRes = await fetch(`${evoUrl}/instance/create`, {
          method: 'POST',
          headers: {
            apikey: evoKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceName: cleanedInstance,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        })

        if (evoRes.ok) {
          evolutionCreated = true
        }
      } catch (evoErr) {
        console.error('Error al autoprovisionar instancia Evolution:', evoErr)
      }
    }

    // Inicializar planes de membresía básicos para el nuevo gimnasio
    try {
      await prisma.membershipPlan.createMany({
        data: [
          {
            tenantId: createdTenant.id,
            name: 'Mensualidad Estándar',
            price: 35.0,
            durationDays: 30,
          },
          {
            tenantId: createdTenant.id,
            name: 'Pase Diario',
            price: 5.0,
            durationDays: 1,
          },
        ],
      })
    } catch {}

    return NextResponse.json({
      success: true,
      tenant: createdTenant,
      evolutionCreated,
    })
  } catch (error: any) {
    console.error('Error al crear tenant en superadmin:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('No autorizado') ? 401 : 500 }
    )
  }
}

