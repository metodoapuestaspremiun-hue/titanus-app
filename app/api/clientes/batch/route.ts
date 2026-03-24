import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const pool = getPool();

        // CASO 1: Importación Masiva (Array de objetos)
        if (Array.isArray(body)) {
            let inserted = 0;
            let errors = 0;

            // Función para convertir fecha de Excel (número) a YYYY-MM-DD
            const excelDateToJS = (serial: any) => {
                if (!serial) return null;
                if (typeof serial === 'string' && serial.includes('-')) return serial; // Ya es string YYYY-MM-DD
                
                try {
                    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
                    return date.toISOString().split('T')[0];
                } catch (e) {
                    return null;
                }
            };

            for (const client of body) {
                try {
                    let { nombre, telefono, fecha_nacimiento, fecha_vencimiento, deuda, estado } = client;
                    if (!nombre || !telefono) {
                        errors++;
                        continue;
                    }

                    const f_nac = excelDateToJS(fecha_nacimiento);
                    const f_ven = excelDateToJS(fecha_vencimiento);
                    const cleanTel = String(telefono).replace(/[^0-9+]/g, '');

                    await pool.query(
                        `INSERT INTO clientes (nombre, telefono, fecha_nacimiento, fecha_vencimiento, deuda, estado) 
                         VALUES (?, ?, ?, ?, ?, ?) 
                         ON DUPLICATE KEY UPDATE 
                         nombre = VALUES(nombre), 
                         fecha_nacimiento = VALUES(fecha_nacimiento), 
                         fecha_vencimiento = VALUES(fecha_vencimiento), 
                         deuda = VALUES(deuda), 
                         estado = VALUES(estado)`,
                        [
                            nombre, 
                            cleanTel, 
                            f_nac, 
                            f_ven, 
                            deuda || 0, 
                            estado || 'activo'
                        ]
                    );
                    inserted++;
                } catch (e) {
                    console.error("Error importando fila:", e);
                    errors++;
                }
            }
            return NextResponse.json({ 
                success: true, 
                stats: { total: body.length, inserted_or_updated: inserted, errors } 
            });
        }

        // CASO 2: Acciones en lote (Selección en tabla)
        const { ids, action } = body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No hay IDs seleccionados" }, { status: 400 });
        }

        if (action === 'delete') {
            await pool.query('DELETE FROM clientes WHERE id IN (?)', [ids]);
        } else if (action === 'activate') {
            await pool.query("UPDATE clientes SET estado = 'activo' WHERE id IN (?)", [ids]);
        } else if (action === 'deactivate') {
            await pool.query("UPDATE clientes SET estado = 'inactivo' WHERE id IN (?)", [ids]);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("CLIENT BATCH ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
