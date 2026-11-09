const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvolution() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } });
  const evoUrl = tenant.evolutionApiUrl || 'http://178.238.238.158:8080';
  const evoKey = tenant.evolutionApiKey || '42a447c1-3d74-4b52-9571-042c174f7621';
  const evoInst = tenant.evolutionInstanceName || 'gym_bot';

  // Check state of instance
  const stateRes = await fetch(`${evoUrl}/instance/connectionState/${evoInst}`, {
    headers: { apikey: evoKey }
  });
  console.log('Connection state:', await stateRes.json());
}

checkEvolution().catch(console.error).finally(() => prisma.$disconnect());

