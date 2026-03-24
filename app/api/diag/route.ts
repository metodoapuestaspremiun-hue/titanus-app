import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function GET() {
    const diag: any = {
        env: {
            host: process.env.MYSQL_HOST ? "Configurado ✅" : "FALTA ❌",
            port: process.env.MYSQL_PORT ? "Configurado ✅" : "FALTA ❌",
            user: process.env.MYSQL_USER ? "Configurado ✅" : "FALTA ❌",
            database: process.env.MYSQL_DATABASE ? "Configurado ✅" : "FALTA ❌",
            password: process.env.MYSQL_PASSWORD ? "Configurado ✅" : "FALTA ❌",
        },
        db_connection: "No probado",
        error: null
    };

    try {
        if (!process.env.MYSQL_HOST) {
            diag.db_connection = "Ignorado por falta de env vars";
        } else {
            const pool = getPool();
            const [rows]: any = await pool.query('SELECT 1 as connection_test');
            diag.db_connection = rows[0]?.connection_test === 1 ? "Conexión Exitosa ✅" : "Error inesperado en query";
        }
    } catch (e: any) {
        diag.db_connection = "FALLO ❌";
        diag.error = e.message;
        console.error("DIAG ERROR:", e);
    }

    return NextResponse.json(diag);
}
