import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/coaches: Lista todos los entrenadores de la sucursal activa
export async function GET(req: Request) {
  try {
    const { tenantId, branchId } = await getTenantFromRequest(req)

    const whereClause: any = { tenantId }
    if (branchId) {
      // Filtrar estrictamente por la sucursal activa (sin mezclar con otras sedes)
      whereClause.branchId = branchId
    }

    const coaches = await prisma.staff.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json({ coaches })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// POST /api/club/coaches: Crear nuevo entrenador asociado a la sucursal activa
export async function POST(req: Request) {
  try {
    const { tenantId, branchId } = await getTenantFromRequest(req)
    const { name, role, avatarUrl, targetBranchId } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const finalBranchId = targetBranchId || branchId || null

    const newCoach = await prisma.staff.create({
      data: {
        tenantId,
        branchId: finalBranchId,
        name: name.trim(),
        role: role || 'TRAINER',
        avatarUrl: avatarUrl?.trim() || null,
        isActive: true,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json({ success: true, coach: newCoach })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// PUT /api/club/coaches: Actualizar avatar u otros datos del entrenador
export async function PUT(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { id, name, role, avatarUrl } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const updatedCoach = await prisma.staff.updateMany({
      where: { id, tenantId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(role ? { role } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl ? avatarUrl.trim() : null } : {}),
      },
    })

    return NextResponse.json({ success: true, updated: updatedCoach })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// DELETE /api/club/coaches: Eliminar entrenador garantizando aislamiento multi-tenant
export async function DELETE(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { searchParams } = new URL(req.url)
    const coachId = searchParams.get('id')

    if (!coachId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await prisma.staff.deleteMany({
      where: { id: coachId, tenantId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
