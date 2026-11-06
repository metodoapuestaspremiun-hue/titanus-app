import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/evaluaciones: Obtiene el ranking real de entrenadores y estadísticas del tenant
export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)

    const coaches = await prisma.staff.findMany({
      where: { tenantId, isActive: true },
      include: {
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
