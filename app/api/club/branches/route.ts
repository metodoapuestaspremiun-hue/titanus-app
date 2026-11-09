import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

function branchCodeFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 20)
}

// GET /api/club/branches – Returns all branches for the authenticated tenant
export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)

    const branches = await prisma.branch.findMany({
      where: { tenantId },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            staff: { where: { isActive: true } },
            payments: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, branches })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status ?? 500 }
    )
  }
}

// POST /api/club/branches – Create a new branch for the tenant (admin/owner only)
export async function POST(req: Request) {
  try {
    const { tenantId, role } = await getTenantFromRequest(req)

    if (role !== 'OWNER' && role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'No autorizado: se requiere rol OWNER o MANAGER' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { name, address, phone, evolutionInstanceName } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la sucursal es obligatorio' },
        { status: 400 }
      )
    }

    const code = branchCodeFromName(name.trim())

    // Check uniqueness of code within tenant
    const existing = await prisma.branch.findUnique({
      where: { tenantId_code: { tenantId, code } },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Ya existe una sucursal con el código '${code}'` },
        { status: 400 }
      )
    }

    const branch = await prisma.branch.create({
      data: {
        tenantId,
        name: name.trim(),
        code,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        evolutionInstanceName: evolutionInstanceName?.trim() || null,
        isMain: false,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, branch })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status ?? 500 }
    )
  }
}
