import { prisma } from '../lib/prisma'

async function main() {
  console.log('Sembrando datos base de Titanus Gym...')

  // 1. Crear o recuperar el Tenant Titanus
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'titanus-gym' },
    update: {},
    create: {
      name: 'Titanus Gym',
      slug: 'titanus-gym',
      referralCommPct: 10.0,      // 10% Cashback Cuota
      storeReferralCommPct: 5.0,  // 5% Cashback Barra/Retail
      currency: 'USD',
      googleReviewUrl: 'https://g.page/r/titanus-gym/review',
      whatsappPhone: '593987654321',
    },
  })

  console.log(`Tenant listo: ${tenant.name} (${tenant.id})`)

  // 2. Crear los Coaches iniciales para el Flujo 1
  const coaches = [
    { name: 'Marcos Rivas', role: 'TRAINER' },
    { name: 'Sofía Caicedo', role: 'TRAINER' },
    { name: 'Javier Morales', role: 'TRAINER' },
  ]

  for (const c of coaches) {
    const existing = await prisma.staff.findFirst({
      where: { tenantId: tenant.id, name: c.name },
    })
    if (!existing) {
      await prisma.staff.create({
        data: {
          tenantId: tenant.id,
          name: c.name,
          role: c.role,
        },
      })
      console.log(`Coach creado: ${c.name}`)
    }
  }

  // 3. Crear planes de membresía base para el Flujo 2
  const plans = [
    { name: 'Mensualidad Estándar', price: 35.0, durationDays: 30 },
    { name: 'Trimestre VIP Spartan', price: 90.0, durationDays: 90 },
    { name: 'Pase Diario', price: 3.5, durationDays: 1 },
  ]

  for (const p of plans) {
    const existing = await prisma.membershipPlan.findFirst({
      where: { tenantId: tenant.id, name: p.name },
    })
    if (!existing) {
      await prisma.membershipPlan.create({
        data: {
          tenantId: tenant.id,
          name: p.name,
          price: p.price,
          durationDays: p.durationDays,
        },
      })
      console.log(`Plan creado: ${p.name}`)
    }
  }

  console.log('✅ Inicialización completa.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

