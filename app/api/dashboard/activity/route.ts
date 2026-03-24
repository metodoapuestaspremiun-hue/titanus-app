import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function GET() {
    try {
        const pool = getPool();
        const [rows]: any = await pool.query(
            "SELECT * FROM cola_mensajes ORDER BY id DESC LIMIT 20"
        );
        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("ACTIVITY ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
