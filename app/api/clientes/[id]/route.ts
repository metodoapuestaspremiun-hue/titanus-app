import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const pool = getPool();
        await pool.query('DELETE FROM clientes WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("CLIENT DELETE ERROR:", error);
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
        const { nombre, telefono, fecha_nacimiento, fecha_vencimiento, deuda, estado } = body;

        const pool = getPool();
        await pool.query(
            'UPDATE clientes SET nombre=?, telefono=?, fecha_nacimiento=?, fecha_vencimiento=?, deuda=?, estado=? WHERE id=?',
            [nombre, telefono, fecha_nacimiento, fecha_vencimiento, deuda, estado, id]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("CLIENT UPDATE ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
