import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/club/coaches: Lista todos los entrenadores
export async function GET() {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    if (!tenant) return NextResponse.json({ coaches: [] })

    const coaches = await prisma.staff.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ coaches })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/club/coaches: Crear nuevo entrenador
export async function POST(req: Request) {
  try {
    const { name, role } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } })
    if (!tenant) return NextResponse.json({ error: 'Tenant no configurado' }, { status: 400 })

    const newCoach = await prisma.staff.create({
      data: {
        tenantId: tenant.id,
        name: name.trim(),
        role: role || 'TRAINER',
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, coach: newCoach })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/club/coaches: Eliminar entrenador
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const coachId = searchParams.get('id')

    if (!coachId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await prisma.staff.delete({
      where: { id: coachId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

