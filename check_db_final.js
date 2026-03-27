const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 3306
    });

    try {
        const [rows] = await connection.execute("SELECT valor FROM configuracion WHERE clave='difusiones_programadas_json'");
        if (rows.length > 0) {
            const parsed = JSON.parse(rows[0].valor);
            fs.writeFileSync('db_output.json', JSON.stringify(parsed, null, 2), 'utf8');
            console.log("Written to db_output.json");
        }

        // Also check cola_mensajes for recent grupo messages
        const [cola] = await connection.execute("SELECT id, nombre, telefono, tipo, estado, mensaje FROM cola_mensajes WHERE telefono LIKE '%@g.us%' ORDER BY id DESC LIMIT 10");
        fs.writeFileSync('cola_grupos.json', JSON.stringify(cola, null, 2), 'utf8');
        console.log("Written cola_grupos.json");
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await connection.end();
    }
}
main();
