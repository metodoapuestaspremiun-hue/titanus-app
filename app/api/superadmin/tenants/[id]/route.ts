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

// GET /api/superadmin/tenants/[id]: Detalle de un gimnasio específico
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSuperAdminFromRequest(req)
    const { id } = await params

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        branches: {
          orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
          include: {
            _count: {
              select: {
                staff: true,
                payments: true,
              },
            },
          },
        },
        staff: {
          select: { id: true, name: true, role: true, isActive: true },
        },
        membershipPlans: true,
        _count: {
          select: {
            customers: true,
            payments: true,
            evaluations: true,
            wallets: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Gimnasio no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, tenant })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('No autorizado') ? 401 : 500 }
    )
  }
}

// PATCH /api/superadmin/tenants/[id]: Actualizar datos del gimnasio
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSuperAdminFromRequest(req)
    const { id } = await params
    const body = await req.json()

    const {
      name,
      slug,
      ownerEmail,
      ownerPassword,
      plan,
      isActive,
      moduleFidelizacion,
      moduleMensajeria,
      evolutionInstanceName,
      evolutionApiUrl,
      evolutionApiKey,
      primaryColor,
      secondaryColor,
      whatsappPhone,
      googleReviewUrl,
      referralCommPct,
      storeReferralCommPct,
      logoUrl,
    } = body

    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    })

    if (!existingTenant) {
      return NextResponse.json(
        { success: false, error: 'Gimnasio no encontrado' },
        { status: 404 }
      )
    }

    const dataToUpdate: any = {}

    if (name !== undefined) dataToUpdate.name = name.trim()
    if (slug !== undefined && slug.trim()) {
      const cleanSlug = slugify(slug.trim())
      if (cleanSlug !== existingTenant.slug) {
        const slugConflict = await prisma.tenant.findUnique({
          where: { slug: cleanSlug },
        })
        if (slugConflict && slugConflict.id !== id) {
          return NextResponse.json(
            { success: false, error: `El slug '${cleanSlug}' ya pertenece a otro gimnasio` },
            { status: 400 }
          )
        }
        dataToUpdate.slug = cleanSlug
      }
    }

    if (ownerEmail !== undefined) {
      const cleanEmail = ownerEmail ? ownerEmail.trim().toLowerCase() : null
      if (cleanEmail && cleanEmail !== existingTenant.ownerEmail) {
        const emailConflict = await prisma.tenant.findUnique({
          where: { ownerEmail: cleanEmail },
        })
        if (emailConflict && emailConflict.id !== id) {
          return NextResponse.json(
            { success: false, error: `El email '${cleanEmail}' ya está asignado a otro gimnasio` },
            { status: 400 }
          )
        }
      }
      dataToUpdate.ownerEmail = cleanEmail
    }

    if (ownerPassword !== undefined && ownerPassword.trim()) {
      dataToUpdate.ownerPasswordHash = crypto
        .createHash('sha256')
        .update(ownerPassword.trim())
        .digest('hex')
    }

    if (plan !== undefined) dataToUpdate.plan = plan
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive)
    if (moduleFidelizacion !== undefined) dataToUpdate.moduleFidelizacion = Boolean(moduleFidelizacion)
    if (moduleMensajeria !== undefined) dataToUpdate.moduleMensajeria = Boolean(moduleMensajeria)
    if (evolutionInstanceName !== undefined) dataToUpdate.evolutionInstanceName = evolutionInstanceName?.trim() || null
    if (evolutionApiUrl !== undefined) dataToUpdate.evolutionApiUrl = evolutionApiUrl?.trim() || null
    if (evolutionApiKey !== undefined) dataToUpdate.evolutionApiKey = evolutionApiKey?.trim() || null
    if (primaryColor !== undefined) dataToUpdate.primaryColor = primaryColor?.trim() || null
    if (secondaryColor !== undefined) dataToUpdate.secondaryColor = secondaryColor?.trim() || null
    if (logoUrl !== undefined) dataToUpdate.logoUrl = logoUrl || null
    if (whatsappPhone !== undefined) dataToUpdate.whatsappPhone = whatsappPhone?.trim() || null
    if (googleReviewUrl !== undefined) dataToUpdate.googleReviewUrl = googleReviewUrl?.trim() || null
    if (referralCommPct !== undefined) dataToUpdate.referralCommPct = Number(referralCommPct)
    if (storeReferralCommPct !== undefined) dataToUpdate.storeReferralCommPct = Number(storeReferralCommPct)

    const updated = await prisma.tenant.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json({ success: true, tenant: updated })
  } catch (error: any) {
    console.error('Error al actualizar tenant en superadmin:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('No autorizado') ? 401 : 500 }
    )
  }
}

// DELETE /api/superadmin/tenants/[id]: Eliminar un gimnasio y sus datos asociados
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSuperAdminFromRequest(req)
    const { id } = await params

    const tenant = await prisma.tenant.findUnique({
      where: { id },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Gimnasio no encontrado' },
        { status: 404 }
      )
    }

    // Proteger el tenant principal Titanus Gym contra borrado accidental
    if (tenant.slug === 'titanus-gym') {
      return NextResponse.json(
        { success: false, error: 'No está permitido eliminar el gimnasio principal raíz (Titanus Gym)' },
        { status: 403 }
      )
    }

    await prisma.tenant.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: `Gimnasio ${tenant.name} eliminado con éxito`,
    })
  } catch (error: any) {
    console.error('Error al eliminar tenant:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('No autorizado') ? 401 : 500 }
    )
  }
}

