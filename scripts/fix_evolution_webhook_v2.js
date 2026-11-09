const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvolutionApi() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } });
  const evoUrl = tenant.evolutionApiUrl || 'http://178.238.238.158:8080';
  const evoKey = tenant.evolutionApiKey || '42a447c1-3d74-4b52-9571-042c174f7621';
  const evoInst = tenant.evolutionInstanceName || 'gym_bot';

  const res = await fetch(`${evoUrl}/webhook/set/${evoInst}`, {
    method: 'POST',
    headers: {
      apikey: evoKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      enabled: true,
      url: 'https://titanus-app.vercel.app/api/club/webhook/whatsapp',
      webhookByEvents: false,
      webhookBase64: false,
      events: [
        'MESSAGES_UPSERT'
      ]
    })
  });
  const data = await res.json();
  console.log('Result:', JSON.stringify(data, null, 2));
}

checkEvolutionApi().catch(console.error).finally(() => prisma.$disconnect());

