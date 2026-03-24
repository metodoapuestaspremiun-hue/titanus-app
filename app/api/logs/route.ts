import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET(request: Request) {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM cola_mensajes 
             WHERE tipo = 'log' OR nombre = 'System Bot' 
             ORDER BY fecha_creacion DESC 
             LIMIT 100`
        );

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("LOGS API ERROR:", error);
        
        // Error descriptivo para el usuario en producción
        let message = error.message;
        if (!process.env.MYSQL_HOST) {
            message = "ERROR: Falta MYSQL_HOST en las variables de entorno de Vercel.";
        } else if (message.includes("ETIMEDOUT") || message.includes("ECONNREFUSED")) {
            message = "ERROR: No se pudo conectar a la base de datos. ¿Están bien las credenciales y el Firewall?";
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
