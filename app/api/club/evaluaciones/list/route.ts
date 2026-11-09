import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/evaluaciones/list: Retorna las evaluaciones con detalle de opiniones y estrellas filtradas por sede
export async function GET(req: Request) {
  try {
    const { tenantId, branchId } = await getTenantFromRequest(req)
    const { searchParams } = new URL(req.url)
    const coachFilter = searchParams.get('coachId')
    const starsFilter = searchParams.get('stars')

    // Filtros dinámicos respetando tenantId y branchId
    const staffWhere: any = { tenantId, isActive: true }
    if (branchId) {
      staffWhere.branchId = branchId
    }

    const coaches = await prisma.staff.findMany({
      where: staffWhere,
      include: { evaluations: true },
    })

    const allowedCoachIds = coaches.map((c) => c.id)

    const whereClause: any = {
      tenantId,
      staffId: { in: allowedCoachIds },
    }
    if (coachFilter && coachFilter !== 'ALL') {
      whereClause.staffId = coachFilter
    }
    if (starsFilter && starsFilter !== 'ALL') {
      whereClause.stars = parseInt(starsFilter)
    }

    const evaluations = allowedCoachIds.length > 0
      ? await prisma.evaluation.findMany({
          where: whereClause,
          include: {
            customer: true,
            staff: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    // Calcular podio
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
        avatarUrl: coach.avatarUrl || null,
        stars: Number(avgStars.toFixed(2)),
        totalReviews,
      }
    })
    ranked.sort((a, b) => b.stars - a.stars)

    return NextResponse.json({
      coaches: ranked,
      evaluations: evaluations.map((e) => ({
        id: e.id,
        stars: e.stars,
        comment: e.comment,
        createdAt: e.createdAt,
        coachId: e.staffId,
        customerName: e.customer?.name || 'Socio Anónimo',
        customerPhone: e.customer?.phone || '',
        coachName: e.staff?.name || 'Entrenador',
      })),
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
