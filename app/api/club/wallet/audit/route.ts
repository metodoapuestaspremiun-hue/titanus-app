import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/wallet/audit: Obtiene métricas de billetera y lista de socios con saldo para la sede activa
export async function GET(req: Request) {
  try {
    const { tenantId, branchId } = await getTenantFromRequest(req)

    // Si hay una sede activa, filtramos los pagos/transacciones para saber los socios que han operado en esta sede
    let branchCustomerIds: string[] | null = null

    if (branchId) {
      // Socios que tienen pagos en esta sede específica
      const branchPayments = await prisma.payment.findMany({
        where: { tenantId, branchId },
        select: { customerId: true },
        distinct: ['customerId'],
      })
      branchCustomerIds = branchPayments.map((p) => p.customerId)
    }

    const walletWhere: any = { tenantId }
    if (branchCustomerIds !== null) {
      walletWhere.customerId = { in: branchCustomerIds }
    }

    const wallets = await prisma.wallet.findMany({
      where: walletWhere,
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
