import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/customers/search?q=...: Búsqueda rápida de socio para el Monitor de Recepción
export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()

    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        wallets: true,
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        membershipActive: c.membershipActive,
        balance: c.wallets[0] ? Number(c.wallets[0].balance) : 0,
        createdAt: c.createdAt,
      })),
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

