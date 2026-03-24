import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function GET() {
    try {
        if (!process.env.MYSQL_HOST) {
            return NextResponse.json({ error: "Falta configurar las variables de entorno en Vercel." }, { status: 500 });
        }
        const pool = getPool();
        
        const now = new Date();
        const ecuadorTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
        const month = ecuadorTime.getMonth() + 1;
        const day = ecuadorTime.getDate();
        const todayStr = ecuadorTime.toISOString().split('T')[0];

        const [clientesResult]: any = await pool.query("SELECT COUNT(*) as count FROM clientes WHERE estado = 'activo' OR estado IS NULL");
        const [vencimientosResult]: any = await pool.query("SELECT COUNT(*) as count FROM clientes WHERE fecha_vencimiento = ? AND (estado = 'activo' OR estado IS NULL)", [todayStr]);
        const [cumpleResult]: any = await pool.query("SELECT COUNT(*) as count FROM clientes WHERE MONTH(fecha_nacimiento) = ? AND DAY(fecha_nacimiento) = ? AND (estado = 'activo' OR estado IS NULL)", [month, day]);
        const [mensajesResult]: any = await pool.query("SELECT COUNT(*) as count FROM cola_mensajes WHERE estado = 'enviado'");
        const [hbResult]: any = await pool.query("SELECT valor, TIMESTAMPDIFF(SECOND, valor, NOW()) as seconds_diff FROM configuracion WHERE clave = 'bot_heartbeat'");

        const stats = {
            total_clientes: clientesResult[0].count || 0,
            vencimientos_hoy: vencimientosResult[0].count || 0,
            cumpleaños_hoy: cumpleResult[0].count || 0,
            mensajes_enviados: mensajesResult[0].count || 0,
            bot_heartbeat: hbResult[0]?.valor ? `${hbResult[0].valor}-05:00` : null,
            seconds_since_heartbeat: hbResult[0]?.seconds_diff ?? 999999
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error("STATS API ERROR:", error);
        return NextResponse.json({ 
            total_clientes: 0,
            vencimientos_hoy: 0,
            cumpleaños_hoy: 0,
            mensajes_enviados: 0,
            bot_heartbeat: null,
            seconds_since_heartbeat: 999999,
            error: error.message 
        }, { status: 500 });
    }
}
