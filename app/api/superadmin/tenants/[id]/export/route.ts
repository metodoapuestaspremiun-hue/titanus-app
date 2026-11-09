import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSuperAdminFromRequest } from '@/lib/auth'

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
            staff: {
              include: {
                evaluations: {
                  select: {
                    id: true,
                    stars: true,
                    comment: true,
                    createdAt: true,
                    customer: { select: { name: true, phone: true } },
                  },
                },
              },
            },
            payments: {
              orderBy: { createdAt: 'desc' },
              include: {
                customer: { select: { name: true, phone: true } },
              },
            },
          },
        },
        customers: {
          orderBy: { createdAt: 'desc' },
          include: {
            wallets: {
              include: {
                transactions: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
        friendPasses: {
          orderBy: { createdAt: 'desc' },
          include: {
            sponsor: { select: { name: true, phone: true } },
          },
        },
        membershipPlans: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Gimnasio no encontrado' }, { status: 404 })
    }

    // Organizar base de datos completa separada por sucursales
    const exportData = {
      exportMetadata: {
        generatedAt: new Date().toISOString(),
        system: 'ALL-CRM SaaS Platform',
        version: 'v2.5 Multi-Branch',
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        ownerEmail: tenant.ownerEmail,
        plan: tenant.plan,
        whatsappPhone: tenant.whatsappPhone,
        currency: tenant.currency,
        referralCommPct: Number(tenant.referralCommPct),
        storeReferralCommPct: Number(tenant.storeReferralCommPct),
        createdAt: tenant.createdAt,
      },
      summary: {
        totalBranches: tenant.branches.length,
        totalCustomers: tenant.customers.length,
        totalPlans: tenant.membershipPlans.length,
        totalFriendPasses: tenant.friendPasses.length,
      },
      // SECCIÓN 1: SEDES FÍSICAS INDEPENDIENTES CON SU PERSONAL, EVALUACIONES Y PAGOS
      branches: tenant.branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        isMain: b.isMain,
        address: b.address,
        phone: b.phone,
        metrics: {
          totalStaff: b.staff.length,
          totalPayments: b.payments.length,
          totalCollectedUSD: b.payments
            .filter((p) => p.status === 'APPROVED')
            .reduce((sum, p) => sum + Number(p.amount), 0),
        },
        staff: b.staff.map((s) => {
          const totalReviews = s.evaluations.length
          const avgStars =
            totalReviews > 0
              ? s.evaluations.reduce((acc, curr) => acc + curr.stars, 0) / totalReviews
              : 5.0
          return {
            id: s.id,
            name: s.name,
            role: s.role,
            isActive: s.isActive,
            rating: {
              averageStars: Number(avgStars.toFixed(2)),
              totalReviews,
            },
            evaluations: s.evaluations,
          }
        }),
        payments: b.payments.map((p) => ({
          id: p.id,
          customerName: p.customer.name,
          customerPhone: p.customer.phone,
          type: p.type,
          amount: Number(p.amount),
          cashbackPct: Number(p.cashbackPct),
          cashbackAmt: Number(p.cashbackAmt),
          status: p.status,
          description: p.description,
          approvedAt: p.approvedAt,
          createdAt: p.createdAt,
        })),
      })),
      // SECCIÓN 2: CARTERA GLOBAL DE CLIENTES Y MONEDEROS
      customers: tenant.customers.map((c) => {
        const wallet = c.wallets[0]
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          membershipActive: c.membershipActive,
          membershipExpiry: c.membershipExpiry,
          wallet: {
            balance: wallet ? Number(wallet.balance) : 0,
            transactions: wallet ? wallet.transactions : [],
          },
        }
      }),
      // SECCIÓN 3: BENEFICIOS DE PASES DE AMIGO
      friendPasses: tenant.friendPasses.map((fp) => ({
        id: fp.id,
        code: fp.code,
        status: fp.status,
        sponsorName: fp.sponsor.name,
        sponsorPhone: fp.sponsor.phone,
        redeemedByName: fp.redeemedByName,
        redeemedByPhone: fp.redeemedByPhone,
        redeemedAt: fp.redeemedAt,
        expiresAt: fp.expiresAt,
        createdAt: fp.createdAt,
      })),
      // SECCIÓN 4: PLANES COMERCIALES
      membershipPlans: tenant.membershipPlans,
    }

    const filename = `backup_${tenant.slug}_${new Date().toISOString().slice(0, 10)}.json`

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar base de datos en SuperAdmin:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

