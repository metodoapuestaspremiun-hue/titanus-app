import axios from 'axios'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://129.153.116.213:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621'
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot'

/**
 * Envía un mensaje de texto mediante la misma instancia activa de Evolution API
 */
export async function sendWhatsAppMessage(phone: string, text: string) {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const recipient = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`

    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`
    const response = await axios.post(
      url,
      {
        number: cleanPhone,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: true,
        },
        textMessage: {
          text: text,
        },
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    return { success: true, data: response.data }
  } catch (error: any) {
    console.error('Error al enviar WhatsApp vía Evolution API:', error?.response?.data || error.message)
    return { success: false, error: error.message }
  }
}

