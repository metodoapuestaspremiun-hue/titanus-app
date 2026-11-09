const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateSurScan() {
  const titanus = await prisma.tenant.findUnique({ where: { slug: 'titanus-gym' } });
  const evoInst = titanus.evolutionInstanceName || 'gym_bot';

  // 1. Generate an active token for Sur
  const testToken = 'MEM-SUR-TEST02';
  await prisma.qrToken.deleteMany({ where: { token: testToken } });
  await prisma.qrToken.create({
    data: {
      tenantId: titanus.id,
      type: 'MEMBERSHIP',
      token: testToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  const payload = {
    event: 'messages.upsert',
    instance: evoInst,
    data: {
      key: {
        remoteJid: '593986962872@s.whatsapp.net',
        fromMe: false,
        id: 'TEST_SUR_' + Date.now()
      },
      pushName: 'Prueba Sede Sur',
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

  console.log('Sur scan response:', await res.json());
}

simulateSurScan().catch(console.error).finally(() => prisma.$disconnect());

