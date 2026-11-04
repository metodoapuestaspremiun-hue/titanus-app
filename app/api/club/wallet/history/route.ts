import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/club/wallet/history?customerId=...&page=1&pageSize=20&type=ALL&dateFrom=&dateTo=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') || '20')))
    const typeFilter = searchParams.get('type') || 'ALL' // ALL | CASHBACK_EARNED | REDEEMED
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!customerId) {
      return NextResponse.json({ error: 'customerId requerido' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    if (!tenant) return NextResponse.json({ error: 'Tenant no configurado' }, { status: 400 })

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { wallets: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const wallet = customer.wallets[0]

    // Construir filtros de transacciones
    const txWhere: any = { walletId: wallet?.id }
    if (typeFilter !== 'ALL') txWhere.type = typeFilter
    if (dateFrom || dateTo) {
      txWhere.createdAt = {}
      if (dateFrom) txWhere.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        txWhere.createdAt.lte = end
      }
    }

    const totalTx = await prisma.walletTransaction.count({ where: txWhere })
    const transactions = await prisma.walletTransaction.findMany({
      where: txWhere,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Pagos asociados (siempre últimos 20, sin paginar)
    const payments = await prisma.payment.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        balance: Number(wallet?.balance || 0),
        membershipActive: customer.membershipActive,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description || 'Movimiento de saldo',
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total: totalTx,
        pages: Math.ceil(totalTx / pageSize),
      },
      payments: payments.map((p) => ({
        id: p.id,
        type: p.type,
        amount: Number(p.amount),
        cashbackAmt: Number(p.cashbackAmt),
        status: p.status,
        description: p.description,
        createdAt: p.createdAt,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

