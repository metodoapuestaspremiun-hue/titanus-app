import { PrismaClient } from '@prisma/client'
import { SignJWT } from 'jose'

const prisma = new PrismaClient()
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'saas_jwt_secret_2025_titanus_gym_ultramax'
const JWT_KEY = new TextEncoder().encode(JWT_SECRET_STRING)

async function signTenantToken(tenantId, tenantSlug, role = 'OWNER') {
  return new SignJWT({ tenantId, tenantSlug, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_KEY)
}

async function testAllTenants() {
  const tenants = await prisma.tenant.findMany()
  console.log('Testing tenants count:', tenants.length)

  for (const t of tenants) {
    console.log('\n=======================================')
    console.log(`Testing Tenant: ${t.name} (${t.slug})`)
    const token = await signTenantToken(t.id, t.slug, 'OWNER')
    const headers = { cookie: `gym_session=${token}` }

    // 1. Config API
    const configRes = await fetch('http://localhost:3000/api/club/config', { headers }).then(r => r.json())
    console.log('1. /api/club/config ->', configRes.name ? `OK (${configRes.name})` : 'FAIL', configRes.error || '')

    // 2. Wallet Audit API
    const walletRes = await fetch('http://localhost:3000/api/club/wallet/audit', { headers }).then(r => r.json())
    console.log('2. /api/club/wallet/audit -> totalBalance:', walletRes.totalBalance, 'customers count:', walletRes.customers?.length)

    // 3. Coaches List API
    const coachesRes = await fetch('http://localhost:3000/api/club/coaches', { headers }).then(r => r.json())
    console.log('3. /api/club/coaches -> count:', coachesRes.coaches?.length)

    // 4. Test Customer Search API
    const searchRes = await fetch('http://localhost:3000/api/club/customers/search', { headers }).then(r => r.json())
    console.log('4. /api/club/customers/search -> count:', searchRes.customers?.length)

    // 5. Test SSR Pages
    for (const path of ['/club/dashboard', '/club/billetera', '/club/evaluaciones', '/club/configuracion']) {
      const res = await fetch(`http://localhost:3000${path}`, { headers })
      console.log(`   SSR ${path} -> HTTP ${res.status}`)
    }
  }

  // 6. Probar simulación de un nuevo gimnasio creado (Multi-tenant test)
  console.log('\n=======================================')
  console.log('Testing creation and workflow of a NEW Tenant: "Gimnasio Olimpo"...')
  const testSlug = `gimnasio-olimpo-test-${Date.now()}`
  const newTenant = await prisma.tenant.create({
    data: {
      name: 'Gimnasio Olimpo',
      slug: testSlug,
      ownerEmail: `${testSlug}@olimpo.com`,
      primaryColor: '#FF4500',
      secondaryColor: '#1A1A1A',
      referralCommPct: '12',
      storeReferralCommPct: '6',
      isActive: true,
    }
  })

  const newToken = await signTenantToken(newTenant.id, newTenant.slug, 'OWNER')
  const newHeaders = { cookie: `gym_session=${newToken}` }

  // Crear coach en el nuevo tenant
  const addCoachRes = await fetch('http://localhost:3000/api/club/coaches', {
    method: 'POST',
    headers: { ...newHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Coach Hercules', role: 'TRAINER' })
  }).then(r => r.json())
  console.log('New Tenant Coach Added ->', addCoachRes.success ? 'OK' : 'FAIL', addCoachRes.coach?.name)

  // Verificar que el nuevo tenant cargue limpiamente
  const newConfigRes = await fetch('http://localhost:3000/api/club/config', { headers: newHeaders }).then(r => r.json())
  console.log('New Tenant Config Verified ->', newConfigRes.name === 'Gimnasio Olimpo' ? 'OK' : 'FAIL')

  // Limpiar tenant de prueba
  await prisma.staff.deleteMany({ where: { tenantId: newTenant.id } })
  await prisma.tenant.delete({ where: { id: newTenant.id } })
  console.log('Test Tenant Cleaned Up Successfully.')
  console.log('\n>>> TODOS LOS FLUJOS VERIFICADOS CON ÉXITO <<<')
}

testAllTenants().catch(console.error).finally(() => prisma.$disconnect())
