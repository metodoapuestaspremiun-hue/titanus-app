const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWebhook() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } });
  const evoUrl = tenant.evolutionApiUrl || 'http://178.238.238.158:8080';
  const evoKey = tenant.evolutionApiKey || '42a447c1-3d74-4b52-9571-042c174f7621';
  const evoInst = tenant.evolutionInstanceName || 'gym_bot';

  console.log('Fetching webhook config for instance:', evoInst, 'at', evoUrl);
  try {
    const res = await fetch(`${evoUrl}/webhook/find/${evoInst}`, {
      headers: { apikey: evoKey }
    });
    const data = await res.json();
    console.log('Evolution Webhook Response:', data);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

checkWebhook()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

