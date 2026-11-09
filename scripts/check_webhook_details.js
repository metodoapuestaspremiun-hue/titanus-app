const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvolutionConfig() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } });
  const evoUrl = tenant.evolutionApiUrl || 'http://178.238.238.158:8080';
  const evoKey = tenant.evolutionApiKey || '42a447c1-3d74-4b52-9571-042c174f7621';
  const evoInst = tenant.evolutionInstanceName || 'gym_bot';

  // Check webhook
  const whRes = await fetch(`${evoUrl}/webhook/find/${evoInst}`, { headers: { apikey: evoKey } });
  const whData = await whRes.json();
  console.log('Webhook Config:', whData);

  // Check fetchInstances
  const instRes = await fetch(`${evoUrl}/instance/fetchInstances`, { headers: { apikey: evoKey } });
  const instData = await instRes.json();
  const inst = (Array.isArray(instData) ? instData : instData?.value || []).find(i => i.name === evoInst);
  console.log('Instance details:', {
    name: inst?.name,
    connectionStatus: inst?.connectionStatus,
    ownerJid: inst?.ownerJid,
  });
}

checkEvolutionConfig().catch(console.error).finally(() => prisma.$disconnect());

