const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tokens = await prisma.qrToken.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Recent QrTokens:');
  console.table(tokens.map(t => ({ id: t.id, type: t.type, token: t.token, expiresAt: t.expiresAt })));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

