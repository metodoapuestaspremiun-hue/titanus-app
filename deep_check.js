const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const c = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT || 3306
    });

    // Get ALL group messages with full details
    const [grp] = await c.execute("SELECT id, nombre, telefono, tipo, estado, LEFT(mensaje,200) as msg FROM cola_mensajes WHERE nombre='Grupo' ORDER BY id DESC LIMIT 10");
    grp.forEach(m => {
        fs.appendFileSync('grp_detail.txt', 'ID:'+m.id+' TEL:'+m.telefono+' EST:'+m.estado+' MSG:'+m.msg.substring(0,80)+'\n', 'ascii');
    });

    // Also reset these to pendiente for resend
    const ids = grp.map(m => m.id);
    console.log('Group msg IDs:', ids.join(','));
    console.log('Group msgs found:', grp.length);
    
    await c.end();
}
main();
