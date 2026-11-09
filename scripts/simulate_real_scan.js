const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateRealScan() {
  const titanus = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } });
  const evoUrl = titanus.evolutionApiUrl || 'http://178.238.238.158:8080';
  const evoKey = titanus.evolutionApiKey || '42a447c1-3d74-4b52-9571-042c174f7621';
  const evoInst = titanus.evolutionInstanceName || 'gym_bot';

  // 1. Generate an active token for Centro
  const testToken = 'MEM-CENTRO-TEST01';
  await prisma.qrToken.deleteMany({ where: { token: testToken } });
  await prisma.qrToken.create({
    data: {
      tenantId: titanus.id,
      type: 'MEMBERSHIP',
      token: testToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
  console.log('Created test token:', testToken);

  // 2. Send webhook payload to Vercel
  const payload = {
    event: 'messages.upsert',
    instance: evoInst,
    data: {
      key: {
        remoteJid: '593986962872@s.whatsapp.net',
        fromMe: false,
        id: 'TEST_REAL_' + Date.now()
      },
      pushName: 'Prueba Titanus',
      message: {
        conversation: `Hola, mi código es ${testToken}`
      }
    }
  };

  const res = await fetch('https://titanus-app.vercel.app/api/club/webhook/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const responseJson = await res.json();
  console.log('Webhook Response from Vercel:', responseJson);
}

simulateRealScan().catch(console.error).finally(() => prisma.$disconnect());

