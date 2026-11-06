import axios from 'axios'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621'
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot'

/**
 * Envía un mensaje de texto mediante Evolution API v2 (formato directo { number, text })
 */
export async function sendWhatsAppMessage(
  phone: string,
  text: string,
  instanceName?: string | null
) {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const instance = instanceName || EVOLUTION_INSTANCE
    const url = `${EVOLUTION_API_URL}/message/sendText/${instance}`

    const response = await axios.post(
      url,
      {
        number: cleanPhone,
        text: text,
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
