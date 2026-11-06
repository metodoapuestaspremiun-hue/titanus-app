import { NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/getTenant';

export async function POST(req: Request) {
    try {
        let apiUrl = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
        let apiKey = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';
        let instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot';

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
        } catch {}

        console.log(`Attempting to logout instance: ${instanceName}`);

        const response = await fetch(
            `${apiUrl}/instance/logout/${instanceName}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await response.json();

        return NextResponse.json({
            success: true,
            data: data
        });
    } catch (error: any) {
        console.error('Error logging out:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to logout'
        }, { status: 500 });
    }
}
