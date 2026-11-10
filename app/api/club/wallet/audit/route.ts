import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/wallet/audit: Obtiene métricas de billetera y lista de socios con saldo para la sede activa
export async function GET(req: Request) {
  try {
    const { tenantId, branchId } = await getTenantFromRequest(req)

    // MÉTRICAS GLOBALES: el total circulante y canjeado es de TODO el gimnasio
    const allWallets = await prisma.wallet.findMany({
      where: { tenantId },
      include: { customer: true },
    })

    const allTransactions = await prisma.walletTransaction.findMany({
      where: { tenantId },
    })

    const totalBalance = allWallets.reduce((acc, curr) => acc + Number(curr.balance), 0)
    const redeemed = allTransactions
      .filter((t) => t.type === 'REDEEMED')
      .reduce((acc, curr) => acc + Number(curr.amount), 0)

    // LISTA DE CLIENTES: solo los que han operado (pagado) en la sede activa
    // Si no hay sede activa, se muestran todos los socios
    let customerIds: string[] | null = null
    if (branchId) {
      const branchPayments = await prisma.payment.findMany({
        where: { tenantId, branchId },
        select: { customerId: true },
        distinct: ['customerId'],
      })
      customerIds = branchPayments.map((p) => p.customerId)
    }

    const filteredWallets = customerIds !== null
      ? allWallets.filter((w) => customerIds!.includes(w.customerId))
      : allWallets

    const customers = filteredWallets.map((w) => ({
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
