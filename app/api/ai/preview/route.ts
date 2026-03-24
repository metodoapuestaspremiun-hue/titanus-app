import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, model, prompt, apiKey } = body;

        let finalApiKey = apiKey;

        if (!finalApiKey && (provider === 'openai' || provider === 'gemini')) {
            const pool = getPool();
            const [data]: any = await pool.query(
                "SELECT clave, valor FROM configuracion WHERE clave IN ('openai_api_key', 'gemini_api_key')"
            );
            
            const configMap: any = {};
            data.forEach((row: any) => configMap[row.clave] = row.valor);

            if (provider === 'openai') finalApiKey = configMap.openai_api_key;
            if (provider === 'gemini') finalApiKey = configMap.gemini_api_key;
        }

        if (!finalApiKey) {
            return NextResponse.json({ error: `API Key no configurada para ${provider}` }, { status: 400 });
        }

        // Logic for AI preview... (mocking response for now to ensure build)
        return NextResponse.json({ 
            response: `Respuesta de prueba para ${provider} usando ${model}` 
        });

    } catch (error: any) {
        console.error("AI PREVIEW ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
