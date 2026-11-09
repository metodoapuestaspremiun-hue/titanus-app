import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'
import { signTenantToken, TENANT_COOKIE_NAME } from '@/lib/auth'

// POST /api/club/branches/switch – Mint a new JWT with the selected branchId
export async function POST(req: Request) {
  try {
    const { tenantId, tenantSlug, role } = await getTenantFromRequest(req)

    const body = await req.json()
    const { branchId } = body

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId es requerido' },
        { status: 400 }
      )
    }

    // Verify the branch belongs to this tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId, isActive: true },
    })

    if (!branch) {
      return NextResponse.json(
        { success: false, error: 'Sucursal no encontrada o inactiva' },
        { status: 404 }
      )
    }

    // Mint a new JWT with the new branchId
    const newToken = await signTenantToken(tenantId, tenantSlug, role ?? 'OWNER', branchId)

    const response = NextResponse.json({ success: true, branch })

    response.cookies.set(TENANT_COOKIE_NAME, newToken, {
      httpOnly: true,
      path: '/',
      maxAge: 604800,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status ?? 500 }
    )
  }
}
