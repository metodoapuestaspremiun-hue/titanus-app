import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function GET() {
    try {
        if (!process.env.MYSQL_HOST) {
            return NextResponse.json({ error: "Falta configurar las variables de entorno (MYSQL_HOST) en Vercel." }, { status: 500 });
        }
        const pool = getPool();
        const [rows]: any = await pool.query(
            "SELECT * FROM cola_mensajes WHERE tipo = 'log' ORDER BY id DESC LIMIT 100"
        );

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("LOGS API ERROR:", error);
        const res: any = [];
        res.error = error.message;
        return NextResponse.json(res, { status: 500 });
    }
}
