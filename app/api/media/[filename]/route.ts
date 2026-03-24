import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const filename = (await params).filename;

        if (!filename) {
            return new Response("Filename required", { status: 400 });
        }

        // Buscar el contenido en la tabla media
        const [rows]: any = await pool.query(
            'SELECT content, mimetype FROM media WHERE filename = ?',
            [filename]
        );

        if (!rows || rows.length === 0) {
            return new Response("Image not found", { status: 404 });
        }

        const { content, mimetype } = rows[0];

        // Retornar el buffer con el tipo de contenido correcto
        return new Response(content, {
            headers: {
                'Content-Type': mimetype || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache por un año
            },
        });
    } catch (error: any) {
        console.error("Media Serving Error:", error);
        
        let message = "Internal Server Error";
        if (!process.env.MYSQL_HOST) {
            message = "ERROR: Falta MYSQL_HOST en Vercel.";
        }

        return new Response(message, { status: 500 });
    }
}
