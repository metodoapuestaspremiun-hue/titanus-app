import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}_${safeName}`;
        
        // Guardar en la base de datos MySQL (BLOB) per Vercel compatibility
        await pool.query(
            'INSERT INTO media (filename, content, mimetype) VALUES (?, ?, ?)',
            [fileName, buffer, file.type]
        );

        // URL pública servida por nuestra propia API
        const publicUrl = `/api/media/${fileName}`;

        return NextResponse.json({ url: publicUrl });
    } catch (error: any) {
        console.error("Media Serving Error:", error);
        
        let message = "Internal Server Error";
        if (!process.env.MYSQL_HOST) {
            message = "ERROR: Falta MYSQL_HOST en Vercel.";
        }

        return new Response(message, { status: 500 });
    }
}
