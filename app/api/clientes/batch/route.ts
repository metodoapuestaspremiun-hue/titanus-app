import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ids, action } = body;

        const pool = getPool();
        if (action === 'delete') {
            await pool.query('DELETE FROM clientes WHERE id IN (?)', [ids]);
        } else if (action === 'activate') {
            await pool.query("UPDATE clientes SET estado = 'activo' WHERE id IN (?)", [ids]);
        } else if (action === 'deactivate') {
            await pool.query("UPDATE clientes SET estado = 'inactivo' WHERE id IN (?)", [ids]);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("CLIENT BATCH ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
