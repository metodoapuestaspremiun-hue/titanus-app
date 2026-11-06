import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getTenantFromRequest } from '@/lib/getTenant';

async function fetchQrCode(req: Request) {
    let apiUrl = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
    let apiKey = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';
    let instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot';

    // Obtener la instancia del tenant actual
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

    const response = await fetch(
        `${apiUrl}/instance/connect/${instanceName}`,
        {
            headers: {
                'apikey': apiKey
            },
            cache: 'no-store'
        }
    );

    const data = await response.json();

    if (data.code || data.base64) {
        try {
            // Si viene base64 directo
            if (data.base64) {
                const base64Data = data.base64.replace(/^data:image\/png;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                return new Response(buffer as any, {
                    status: 200,
                    headers: {
                        'Content-Type': 'image/png',
                        'Cache-Control': 'no-store',
                    }
                });
            }

            // Si viene la cadena de código QR
            const qrImageBuffer = await QRCode.toBuffer(data.code, {
                type: 'png',
                width: 512,
                margin: 2
            });

            return new Response(qrImageBuffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'no-store',
                }
            });
        } catch (qrError) {
            console.error('QR Generation Error:', qrError);
            return NextResponse.json({
                success: false,
                error: 'Failed to generate QR image'
            }, { status: 500 });
        }
    } else {
        return NextResponse.json({
            success: false,
            error: data.message || 'No QR code available.'
        }, { status: 400 });
    }
}

export async function POST(req: Request) {
    try {
        return await fetchQrCode(req);
    } catch (error: any) {
        console.error('Error fetching QR code:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch QR code'
        }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        return await fetchQrCode(req);
    } catch (error: any) {
        console.error('Error fetching QR code:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch QR code'
        }, { status: 500 });
    }
}
