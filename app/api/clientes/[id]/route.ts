import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        await pool.query('DELETE FROM clientes WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body = await request.json();

        // Evitar que actualicen el ID
        delete body.id;

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ error: "No data provided" }, { status: 400 });
        }

        await pool.query('UPDATE clientes SET ? WHERE id = ?', [body, id]);

        // Obtener el registro actualizado (opcional, para mantener paridad con Supabase .select().single())
        const [rows]: any = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
        
        return NextResponse.json(rows[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
