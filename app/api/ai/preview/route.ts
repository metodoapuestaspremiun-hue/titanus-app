import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, prompt, variables } = body;
        
        let finalApiKey = apiKey;

        if (finalApiKey === "******** (Configurado)") {
            finalApiKey = "";
        }

        if (!finalApiKey && (provider === 'openai' || provider === 'gemini')) {
            const [data]: any = await pool.query(
                "SELECT clave, valor FROM configuracion WHERE clave IN ('openai_api_key', 'gemini_api_key')"
            );
            if (data) {
                const map: any = {};
                data.forEach((r: any) => map[r.clave] = r.valor);
                if (provider === 'openai') finalApiKey = map['openai_api_key'];
                if (provider === 'gemini') finalApiKey = map['gemini_api_key'];
            }
        }

        if (!finalApiKey) {
            return NextResponse.json({ result: "⚠️ Falta la API Key del proveedor seleccionado. Guárdala primero." });
        }

        let filledPrompt = prompt;
        const systemRule = "REGLA CRÍTICA: NO uses nombres propios reales en tu respuesta. USA SIEMPRE el placeholder {{Nombre}} para referirte al cliente. Ejemplo: '¡Hola {{Nombre}}!'";
        const finalPromptForAI = `SYSTEM RULE: ${systemRule}\n\nUSER PROMPT: ${filledPrompt}`;

        let aiResponse = "";

        if (provider === 'openai') {
            const [modelData]: any = await pool.query("SELECT valor FROM configuracion WHERE clave = 'openai_model'");
            const selectedModel = modelData[0]?.valor || "gpt-3.5-turbo";

            const url = "https://api.openai.com/v1/chat/completions";
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${finalApiKey}`
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: "system", content: "Eres un asistente de Titanus Fitness. REGLA: Usa placeholders tipo {{Nombre}} siempre que sea posible." },
                        { role: "user", content: finalPromptForAI }
                    ]
                })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            aiResponse = json.choices[0].message.content;
        }
        else if (provider === 'gemini') {
            // ... (Gemini model discovery logic remains same as it only uses fetch)
            const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${finalApiKey}`;
            let bestModel = "";

            try {
                const listRes = await fetch(listUrl);
                const listJson = await listRes.json();

                if (listJson.models) {
                    const available = listJson.models
                        .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
                        .map((m: any) => m.name.replace('models/', ''));

                    const priority = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest', 'gemini-pro', 'gemini-pro-latest'];
                    bestModel = priority.find(p => available.includes(p)) || available[0] || "gemini-pro";
                } else {
                    bestModel = "gemini-pro";
                }
            } catch (e) {
                bestModel = "gemini-pro";
            }

            const url = `https://generativelanguage.googleapis.com/v1/models/${bestModel}:generateContent?key=${finalApiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPromptForAI }] }]
                })
            });

            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            aiResponse = json.candidates?.[0]?.content?.parts?.[0]?.text || `Model ${bestModel} responded, but no text found.`;
        }
        else {
            aiResponse = "Proveedor no soportado para preview.";
        }

        return NextResponse.json({ result: aiResponse });

    } catch (error: any) {
        console.error("AI Preview Error:", error);
        let userMessage = error.message;

        if (userMessage.includes("Quota exceeded") || userMessage.includes("quota")) {
            userMessage = "⚠️ Límite de Google alcanzado (Cuota Excedida). \n\nEsto sucede porque la cuenta es nueva o ha enviado demasiadas solicitudes seguidas. \n\nPor favor, espera 1 minuto y vuelve a intentar. Si persiste, revisa que el Pago esté configurado en Google Cloud o usa una API Key diferente.";
        }

        return NextResponse.json({ result: userMessage });
    }
}
