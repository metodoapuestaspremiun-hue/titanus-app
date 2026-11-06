const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  const updated = await prisma.tenant.update({
    where: { slug: 'titanus-gym' },
    data: {
      logoUrl: 'https://mvps.b-cdn.net/logos/titanus-gym/logo.webp',
      primaryColor: '#ffe202',
    },
  })
  console.log('Updated Titanus tenant:')
  console.log('  logoUrl:     ', updated.logoUrl)
  console.log('  primaryColor:', updated.primaryColor)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); return prisma.$disconnect() })
