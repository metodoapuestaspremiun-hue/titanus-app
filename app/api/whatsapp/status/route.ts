import { NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/getTenant';

export async function GET(req: Request) {
    try {
        let instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot';
        let apiUrl = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
        let apiKey = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';

        // Obtener el tenant actual de la solicitud para que cada gimnasio consulte su propia instancia
        try {
            const { tenant } = await getTenantFromRequest(req);
            if (tenant) {
                if (tenant.evolutionInstanceName) {
                    instanceName = tenant.evolutionInstanceName;
                }
                if (tenant.evolutionApiUrl) {
                    apiUrl = tenant.evolutionApiUrl;
                }
                if (tenant.evolutionApiKey) {
                    apiKey = tenant.evolutionApiKey;
                }
            }
        } catch {
            // Si es llamado sin sesión club, se usa el fallback
        }

        const response = await fetch(
            `${apiUrl}/instance/connectionState/${instanceName}`,
            {
                headers: {
                    'apikey': apiKey
                },
                cache: 'no-store'
            }
        );

        const data = await response.json();
        const state = data?.instance?.state || data?.state || 'close';
        const isConnected = state === 'open';

        return NextResponse.json({
            connected: isConnected,
            state: state,
            instance: instanceName,
            version: '2.3.7'
        });
    } catch (error) {
        console.error('Error checking WhatsApp status:', error);
        return NextResponse.json({
            connected: false,
            state: 'error',
            error: 'Failed to check status'
        }, { status: 500 });
    }
}
