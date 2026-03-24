import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function GET() {
    try {
        if (!process.env.MYSQL_HOST) {
            return NextResponse.json({ error: "Faltan variables en Vercel." }, { status: 500 });
        }
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("CLIENTS GET ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { nombre, telefono, fecha_nacimiento, fecha_vencimiento, deuda, estado } = body;

        if (!nombre || !telefono) throw new Error("Nombre y teléfono son obligatorios");
        nombre = nombre.substring(0, 100).replace(/[<>]/g, '');
        telefono = telefono.replace(/[^0-9+]/g, '').substring(0, 20);

        const pool = getPool();
        await pool.query(
            'INSERT INTO clientes (nombre, telefono, fecha_nacimiento, fecha_vencimiento, deuda, estado) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, telefono, fecha_nacimiento || null, fecha_vencimiento || null, deuda || 0, estado || 'activo']
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("CLIENTS POST ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
