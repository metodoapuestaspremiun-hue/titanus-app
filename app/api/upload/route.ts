import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}_${safeName}`;
        
        const pool = getPool();
        await pool.query(
            'INSERT INTO media (filename, content, mimetype) VALUES (?, ?, ?)',
            [fileName, buffer, file.type]
        );

        const publicUrl = `/api/media/${fileName}`;
        return NextResponse.json({ url: publicUrl });
    } catch (error: any) {
        console.error("UPLOAD API ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
