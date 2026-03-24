import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function POST() {
    try {
        const pool = getPool();
        await pool.query("DELETE FROM cola_mensajes WHERE estado = 'pendiente'");
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("QUEUE CLEAR ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
