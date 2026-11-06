import { prisma } from '../lib/prisma'
import crypto from 'crypto'

async function main() {
  console.log('Sembrando datos base de Titanus Gym y SaaS...')

  // 1. SuperAdmin seed
  const adminEmail = 'superadmin@saas.com'
  const adminPassword = 'SuperAdmin2025!'
  const superAdminPasswordHash = crypto.createHash('sha256').update(adminPassword).digest('hex')

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: adminEmail },
    update: { passwordHash: superAdminPasswordHash },
    create: {
      email: adminEmail,
      passwordHash: superAdminPasswordHash,
    },
  })
  console.log(`SuperAdmin listo: ${superAdmin.email}`)

  // 2. Crear o actualizar el Tenant Titanus
  const titanusOwnerEmail = 'admin@titanusgym.com'
  const titanusPassword = 'Contraseña123.'
  const titanusPasswordHash = crypto.createHash('sha256').update(titanusPassword).digest('hex')

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'titanus-gym' },
    update: {
      ownerEmail: titanusOwnerEmail,
      ownerPasswordHash: titanusPasswordHash,
      evolutionInstanceName: 'gym_bot',
      moduleFidelizacion: true,
      moduleMensajeria: true,
      plan: 'PRO',
      primaryColor: '#FCDD09',
      secondaryColor: '#000000',
    },
    create: {
      name: 'Titanus Gym',
      slug: 'titanus-gym',
      ownerEmail: titanusOwnerEmail,
      ownerPasswordHash: titanusPasswordHash,
      evolutionInstanceName: 'gym_bot',
      moduleFidelizacion: true,
      moduleMensajeria: true,
      plan: 'PRO',
      primaryColor: '#FCDD09',
      secondaryColor: '#000000',
      referralCommPct: 10.0,      // 10% Cashback Cuota
      storeReferralCommPct: 5.0,  // 5% Cashback Barra/Retail
      currency: 'USD',
      googleReviewUrl: 'https://g.page/r/titanus-gym/review',
      whatsappPhone: '593987654321',
    },
  })

  console.log(`Tenant listo: ${tenant.name} (${tenant.id}) con owner ${tenant.ownerEmail}`)

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

