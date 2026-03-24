import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function GET() {
    try {
        if (!process.env.MYSQL_HOST) {
            return NextResponse.json({ error: "Faltan variables de entorno en Vercel." }, { status: 500 });
        }
        const pool = getPool();
        const [rows]: any = await pool.query('SELECT * FROM configuracion');

        const configMap = rows.reduce((acc: any, row: any) => {
            let valor = row.valor;
            if (row.clave.includes('_api_key') && valor && valor.length > 5) {
                valor = "******** (Configurado)";
            }
            acc[row.clave] = valor;
            return acc;
        }, {});

        return NextResponse.json(configMap);
    } catch (error: any) {
        console.error("CONFIG GET ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { clave, valor } = body;

        if (!clave || typeof clave !== 'string') return NextResponse.json({ error: "Clave inválida" }, { status: 400 });
        clave = clave.replace(/[^a-zA-Z0-9_]/g, '');

        if (clave.startsWith('prompt_') && valor && valor.length > 2000) {
            valor = valor.substring(0, 2000);
        }

        if (valor === "******** (Configurado)") {
            return NextResponse.json({ success: true });
        }

        const pool = getPool();
        await pool.query(
            'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
            [clave, valor]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("CONFIG POST ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
