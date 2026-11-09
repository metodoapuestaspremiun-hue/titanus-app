const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvolutionWebhookEvents() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } });
  const evoUrl = tenant.evolutionApiUrl || 'http://178.238.238.158:8080';
  const evoKey = tenant.evolutionApiKey || '42a447c1-3d74-4b52-9571-042c174f7621';
  const evoInst = tenant.evolutionInstanceName || 'gym_bot';

  // Evolution API v2 uses 'messages.upsert' or 'MESSAGES_UPSERT'.
  // Often setting webhook with both or full events list fixes missing deliveries!
  console.log('Updating webhook on Evolution API with all message events...');
  const res = await fetch(`${evoUrl}/webhook/set/${evoInst}`, {
    method: 'POST',
    headers: {
      apikey: evoKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://titanus-app.vercel.app/api/club/webhook/whatsapp',
      enabled: true,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        'MESSAGES_UPSERT',
        'messages.upsert',
        'SEND_MESSAGE'
      ]
    })
  });
  const data = await res.json();
  console.log('Result of updating webhook:', data);
}

checkEvolutionWebhookEvents().catch(console.error).finally(() => prisma.$disconnect());

