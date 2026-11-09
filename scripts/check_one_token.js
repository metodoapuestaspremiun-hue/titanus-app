const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const token = await prisma.qrToken.findFirst({
    where: { token: 'MEM-CENTRO-66E5E0' }
  });
  console.log('TOKEN RECORD IN DB:', token);
}

check().catch(console.error).finally(() => prisma.$disconnect());

