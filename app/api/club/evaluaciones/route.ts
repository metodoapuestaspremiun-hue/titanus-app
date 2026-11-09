import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/evaluaciones: Obtiene el ranking real de entrenadores filtrado estrictamente por la sucursal activa
export async function GET(req: Request) {
  try {
    const { tenantId, branchId } = await getTenantFromRequest(req)

    const whereClause: any = { tenantId, isActive: true }
    if (branchId) {
      whereClause.branchId = branchId
    }

    const coaches = await prisma.staff.findMany({
      where: whereClause,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        evaluations: true,
      },
    })

    const ranked = coaches.map((coach) => {
      const totalReviews = coach.evaluations.length
      const avgStars =
        totalReviews > 0
          ? coach.evaluations.reduce((acc, curr) => acc + curr.stars, 0) / totalReviews
          : 5.0

      return {
        id: coach.id,
        name: coach.name,
        role: coach.role,
        branch: coach.branch?.name || 'Sede Principal',
        stars: Number(avgStars.toFixed(2)),
        totalReviews,
      }
    })

    // Ordenar de mayor a menor puntaje
    ranked.sort((a, b) => b.stars - a.stars)

    return NextResponse.json({ coaches: ranked })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
