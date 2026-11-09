async function testVercelWebhook() {
  const payload = {
    event: 'messages.upsert',
    instance: 'gym_bot',
    data: {
      key: {
        remoteJid: '593986962872@s.whatsapp.net',
        fromMe: false,
        id: 'TEST_' + Date.now()
      },
      pushName: 'Usuario Prueba',
      message: {
        conversation: 'Hola, mi código es MEM-CENTRO-66E5E0'
      }
    }
  };

  console.log('Sending payload to Vercel webhook...');
  try {
    const res = await fetch('https://titanus-app.vercel.app/api/club/webhook/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Vercel status:', res.status);
    const data = await res.text();
    console.log('Vercel response body:', data);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testVercelWebhook();

