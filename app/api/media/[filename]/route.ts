import getPool from '@/lib/mysql';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const filename = (await params).filename;

        if (!filename) {
            return new Response("Filename required", { status: 400 });
        }

        const pool = getPool();
        const [rows]: any = await pool.query(
            'SELECT content, mimetype FROM media WHERE filename = ?',
            [filename]
        );

        if (!rows || rows.length === 0) {
            return new Response("Image not found", { status: 404 });
        }

        const { content, mimetype } = rows[0];

        return new Response(content, {
            headers: {
                'Content-Type': mimetype || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error: any) {
        console.error("MEDIA API ERROR:", error);
        return new Response(error.message, { status: 500 });
    }
}
