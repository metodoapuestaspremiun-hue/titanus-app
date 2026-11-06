import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/wallet/audit: Obtiene métricas globales de billetera y lista de socios con saldo para el tenant
export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)

    const wallets = await prisma.wallet.findMany({
      where: { tenantId },
      include: {
        customer: true,
      },
    })

    const transactions = await prisma.walletTransaction.findMany({
      where: { tenantId },
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
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
