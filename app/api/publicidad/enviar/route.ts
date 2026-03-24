import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id_publicidad, ids_clientes } = body;

        const pool = getPool();
        // Logic for sending advertising...
        for (const clientId of ids_clientes) {
            await pool.query(
                "INSERT INTO cola_mensajes (id_cliente, mensaje, tipo, estado) SELECT ?, contenido, 'publicidad', 'pendiente' FROM publicidad WHERE id = ?",
                [clientId, id_publicidad]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("ADVERTISING SEND ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
