const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulate() {
  const rawText = "Hola, mi código es MEM-CENTRO-66E5E0";
  console.log("Input:", rawText);

  const match = rawText.match(/(MEM-[A-Z0-9-]+|RET-[A-Z0-9-]+|EVAL-[A-Z0-9-]+|\bMEM\b|\bRET\b|\bEVAL\b)/i);
  const tokenExtracted = match ? match[1].toUpperCase() : rawText.trim().toUpperCase();
  console.log("tokenExtracted:", tokenExtracted);

  const titanus = await prisma.tenant.findUnique({
    where: { slug: 'titanus-gym' },
    include: { branches: true }
  });

  const branches = titanus.branches;
  console.log("Branches:", branches.map(b => ({ code: b.code, name: b.name })));

  let explicitBranch = null;
  for (const b of branches) {
    if (tokenExtracted.includes(`-${b.code}`) || tokenExtracted.endsWith(b.code)) {
      explicitBranch = b;
      break;
    }
  }
  console.log("explicitBranch matched:", explicitBranch?.name);

  // Check if token was in DB
  const validQr = await prisma.qrToken.findFirst({
    where: {
      tenantId: titanus.id,
      token: tokenExtracted
    }
  });
  console.log("Token in DB?:", validQr ? "YES" : "NO", validQr);
}

simulate().catch(console.error).finally(() => prisma.$disconnect());

