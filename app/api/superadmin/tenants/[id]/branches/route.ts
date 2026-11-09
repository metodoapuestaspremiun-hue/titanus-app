import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSuperAdminFromRequest } from '@/lib/auth'

function branchCodeFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 20)
}

// GET /api/superadmin/tenants/[id]/branches: Lista sucursales del tenant
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSuperAdminFromRequest(req)
    const { id } = await params

    const branches = await prisma.branch.findMany({
      where: { tenantId: id },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            staff: true,
            payments: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, branches })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('No autorizado') ? 401 : 500 }
    )
  }
}

// POST /api/superadmin/tenants/[id]/branches: Crear nueva sucursal para el tenant
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSuperAdminFromRequest(req)
    const { id: tenantId } = await params
    const body = await req.json()
    const { name, address, phone } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la sucursal es obligatorio' },
        { status: 400 }
      )
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Gimnasio no encontrado' },
        { status: 404 }
      )
    }

    const baseCode = branchCodeFromName(name) || `SUC${Date.now().toString().slice(-4)}`
    let code = baseCode
    let suffix = 1
    while (await prisma.branch.findUnique({ where: { tenantId_code: { tenantId, code } } })) {
      code = `${baseCode.slice(0, 16)}${suffix++}`
    }

    const branch = await prisma.branch.create({
      data: {
        tenantId,
        name: name.trim(),
        code,
        address: address?.trim() || null,
        phone: phone?.trim() || tenant.whatsappPhone || null,
        evolutionInstanceName: tenant.evolutionInstanceName || null,
        isMain: false,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, branch })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/superadmin/tenants/[id]/branches: Eliminar o desactivar una sucursal
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSuperAdminFromRequest(req)
    const { id: tenantId } = await params
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId es requerido' },
        { status: 400 }
      )
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, error: 'Sucursal no encontrada' },
        { status: 404 }
      )
    }

    if (branch.isMain) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar la sucursal matriz/principal' },
        { status: 400 }
      )
    }

    await prisma.branch.delete({
      where: { id: branchId },
    })

    return NextResponse.json({ success: true, message: 'Sucursal eliminada' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

