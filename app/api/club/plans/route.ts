import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/plans: Lista todos los planes de membresía del gimnasio activo
export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)

    const plans = await prisma.membershipPlan.findMany({
      where: { tenantId },
      orderBy: { price: 'asc' },
    })

    return NextResponse.json({ success: true, plans })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// POST /api/club/plans: Crea un nuevo plan de membresía
export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { name, price, durationDays } = await req.json()

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Nombre y precio son obligatorios' }, { status: 400 })
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        tenantId,
        name: name.trim(),
        price: Number(price),
        durationDays: durationDays ? parseInt(durationDays) : 30,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// PUT /api/club/plans: Edita un plan existente
export async function PUT(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { id, name, price, durationDays, isActive } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'ID es obligatorio' }, { status: 400 })
    }

    // Verificar pertenencia al tenant
    const existing = await prisma.membershipPlan.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    const updated = await prisma.membershipPlan.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        price: price !== undefined ? Number(price) : undefined,
        durationDays: durationDays !== undefined ? parseInt(durationDays) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    })

    return NextResponse.json({ success: true, plan: updated })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// DELETE /api/club/plans?id=... : Elimina un plan
export async function DELETE(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID no especificado' }, { status: 400 })
    }

    const existing = await prisma.membershipPlan.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    await prisma.membershipPlan.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Plan eliminado' })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

