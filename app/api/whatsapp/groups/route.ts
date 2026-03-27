import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    try {
        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
        const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
            console.error("GROUPS: Variables de entorno faltantes");
            return NextResponse.json({ error: "Configuración de Evolution API incompleta" }, { status: 500 });
        }

        const response = await axios.get(
            `${EVOLUTION_API_URL}/group/fetchAllGroups/${EVOLUTION_INSTANCE_NAME}?getParticipants=false`,
            {
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // Aumentado a 60 segundos por si hay muchos grupos
            }
        );

        if (!response.data) {
            return NextResponse.json([]);
        }

        // La Evolution API puede devolver un array directo o un objeto con los grupos dentro
        let rawGroups: any[] = [];
        
        if (Array.isArray(response.data)) {
            rawGroups = response.data;
        } else if (typeof response.data === 'object') {
            // Buscar el primer array dentro del objeto de respuesta
            const possibleArrays = Object.values(response.data).filter(Array.isArray);
            if (possibleArrays.length > 0) {
                rawGroups = possibleArrays[0] as any[];
            } else {
                console.error("GROUPS: Respuesta inesperada de Evolution API:", JSON.stringify(response.data).slice(0, 500));
                return NextResponse.json([]);
            }
        }

        // Map the results to just what we need: id and name
        const groups = rawGroups
            .filter((g: any) => g && (g.id || g.jid))
            .map((g: any) => ({
                id: g.id || g.jid,
                name: g.subject || g.name || g.pushName || 'Grupo sin nombre'
            }));

        return NextResponse.json(groups);

    } catch (error: any) {
        console.error("WHATSAPP GROUPS ERROR:", error.response?.status, error.response?.data || error.message);
        return NextResponse.json(
            { error: `Error al obtener grupos: ${error.response?.status || error.message}` }, 
            { status: 500 }
        );
    }
}
