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

    // 1. Reset the 4 failed group messages to 'pendiente' so the bot re-sends them
    const [result] = await c.execute("UPDATE cola_mensajes SET estado='pendiente', fecha_envio=NULL WHERE nombre='Grupo' AND estado='error'");
    console.log('Reset group msgs:', result.affectedRows);

    // 2. Check what the messages look like 
    const [msgs] = await c.execute("SELECT id, telefono, estado, LEFT(mensaje,100) as msg FROM cola_mensajes WHERE nombre='Grupo' AND estado='pendiente'");
    msgs.forEach(m => console.log('ID:'+m.id, 'TEL:'+m.telefono, 'MSG_START:'+m.msg.substring(0,40)));

    // 3. Create a fresh test campaign for RIGHT NOW targeting Objetivo_Personal
    const [cfg] = await c.execute("SELECT valor FROM configuracion WHERE clave='difusiones_programadas_json'");
    const campaigns = JSON.parse(cfg[0].valor);
    
    // Get time 2 minutes from now in Ecuador timezone
    const now = new Date();
    const ecNow = new Date(now.toLocaleString('en-US', {timeZone: 'America/Guayaquil'}));
    ecNow.setMinutes(ecNow.getMinutes() + 2);
    const testHora = ecNow.toTimeString().substring(0,5);
    const testFecha = ecNow.toISOString().substring(0,10);
    
    const newCampaign = {
        fecha: testFecha,
        hora: testHora,
        estado: 'pendiente',
        mensaje: 'Prueba de grupo funcionando correctamente desde el bot!',
        imagen: '',
        target: {
            tipo: 'grupos',
            grupos_ids: ['593963410409-1635346669@g.us']
        }
    };
    
    campaigns.push(newCampaign);
    await c.execute("UPDATE configuracion SET valor=? WHERE clave='difusiones_programadas_json'", [JSON.stringify(campaigns)]);
    console.log('New test campaign added for', testFecha, testHora);
    console.log('Campaign target:', JSON.stringify(newCampaign.target));

    await c.end();
}
main();
