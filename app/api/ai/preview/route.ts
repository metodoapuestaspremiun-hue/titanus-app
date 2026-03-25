import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

// Forzar la carga de .env.local por si el dev server no se ha reiniciado
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

export async function POST(request: Request) {
    let provider = "desconocido";
    try {
        const body = await request.json();
        provider = body.provider || "desconocido";
        const { model, prompt, apiKey } = body;

        console.log(`DEBUG AI PREVIEW: Provider=${provider}, HasApiKey=${!!apiKey}`);

        let finalApiKey = apiKey;

        // Si la llave no viene o viene como placeholder, buscar en DB o ENV
        if (!finalApiKey || finalApiKey === "******** (Configurado)") {
            const pool = getPool();
            const [data]: any = await pool.query(
                "SELECT clave, valor FROM configuracion WHERE clave IN ('openai_api_key', 'gemini_api_key', 'groq_api_key')"
            );
            
            const configMap: any = {};
            data.forEach((row: any) => configMap[row.clave] = row.valor);

            if (provider === 'openai') finalApiKey = configMap.openai_api_key;
            if (provider === 'gemini') finalApiKey = configMap.gemini_api_key;
            if (provider === 'groq') finalApiKey = configMap.groq_api_key || process.env.GROQ_API_KEY;
            
            console.log(`DEBUG AI PREVIEW: Fetched Key for ${provider}. Success=${!!finalApiKey}`);
        }

        if (!finalApiKey) {
            console.error(`ERROR AI PREVIEW: API Key missing for ${provider}`);
            return NextResponse.json({ 
                error: `API Key no configurada para ${provider}. Por favor, escribe la llave en el campo superior y presiona 'Listo' o 'Guardar'.` 
            }, { status: 400 });
        }

        let result = "";

        if (provider === 'openai') {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model || "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "ERES UN COACH TITANUS. REGLA: Usa {{Nombre}} como placeholder para el nombre." },
                    { role: "user", content: prompt }
                ]
            }, { headers: { Authorization: `Bearer ${finalApiKey}` } });
            result = response.data.choices[0].message.content;
        } 
        else if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={finalApiKey}`.replace('{finalApiKey}', finalApiKey);
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: `ERES UN COACH TITANUS. REGLA: Usa {{Nombre}} como placeholder para el nombre.\n\nInstrucciones: ${prompt}` }] }]
            });
            result = response.data.candidates[0].content.parts[0].text;
        }
        else if (provider === 'groq') {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "ERES UN COACH TITANUS. REGLA: Usa {{Nombre}} como placeholder para el nombre." },
                    { role: "user", content: prompt }
                ]
            }, { headers: { Authorization: `Bearer ${finalApiKey}` } });
            result = response.data.choices[0].message.content;
        }

        return NextResponse.json({ result: result.trim() });

    } catch (error: any) {
        console.error(`AI PREVIEW ERROR (${provider}):`, error.response?.data || error);
        const detail = error.response?.data?.error?.message || error.message;
        return NextResponse.json({ error: `Error de la API (${provider}): ${detail}` }, { status: 500 });
    }
}
