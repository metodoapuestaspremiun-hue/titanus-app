import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/club/wallet: Obtiene métricas globales de billetera y lista de socios con saldo
export async function GET() {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    if (!tenant) return NextResponse.json({ totalBalance: 0, redeemed: 0, customers: [] })

    const wallets = await prisma.wallet.findMany({
      where: { tenantId: tenant.id },
      include: {
        customer: true,
      },
    })

    const transactions = await prisma.walletTransaction.findMany({
      where: { tenantId: tenant.id },
    })

    const totalBalance = wallets.reduce((acc, curr) => acc + Number(curr.balance), 0)
    const redeemed = transactions
      .filter((t) => t.type === 'REDEEMED')
      .reduce((acc, curr) => acc + Number(curr.amount), 0)

    const customers = wallets.map((w) => ({
      id: w.customer.id,
      name: w.customer.name,
      phone: w.customer.phone,
      balance: Number(w.balance),
    }))

    return NextResponse.json({
      totalBalance: Number(totalBalance.toFixed(2)),
      redeemed: Number(redeemed.toFixed(2)),
      customers,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

