import { NextResponse } from 'next/server';
import getPool from '@/lib/mysql';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const search = searchParams.get('search') || '';
        const limit = 20;
        const offset = (page - 1) * limit;

        const pool = getPool();
        
        let query = "SELECT * FROM cola_mensajes";
        let countQuery = "SELECT COUNT(*) as total FROM cola_mensajes";
        const params: any[] = [];

        if (search) {
            query += " WHERE mensaje LIKE ? OR telefono LIKE ?";
            countQuery += " WHERE mensaje LIKE ? OR telefono LIKE ?";
            params.push(`%${search}%`, `%${search}%`);
        }

        query += " ORDER BY id DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const [rows]: any = await pool.query(query, params);
        const [countResult]: any = await pool.query(countQuery, search ? [`%${search}%`, `%${search}%`] : []);
        
        const total = countResult[0].total;
        const pages = Math.ceil(total / limit);

        return NextResponse.json({
            items: rows,
            pagination: {
                total,
                pages,
                currentPage: page
            }
        });
    } catch (error: any) {
        console.error("ACTIVITY ERROR:", error);
        return NextResponse.json({ 
            items: [], 
            pagination: { total: 0, pages: 0, currentPage: 1 },
            error: error.message 
        }, { status: 500 });
    }
}
