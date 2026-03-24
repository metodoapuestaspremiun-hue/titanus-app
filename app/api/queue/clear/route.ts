import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST() {
    try {
        // Borrar todos los mensajes de la cola (para reiniciar pruebas)
        const [result]: any = await pool.query('DELETE FROM cola_mensajes WHERE id > 0');

        return NextResponse.json({ success: true, count: result.affectedRows });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
