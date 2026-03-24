require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log("Testing MySQL Connection...");
    console.log("Host:", process.env.MYSQL_HOST);
    console.log("User:", process.env.MYSQL_USER);
    console.log("Database:", process.env.MYSQL_DATABASE);

    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: parseInt(process.env.MYSQL_PORT),
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        console.log("✅ Conexión Exitosa!");

        const [tables] = await connection.query("SHOW TABLES");
        console.log("Tablas encontradas:", tables.map(t => Object.values(t)[0]));

        await connection.end();
    } catch (error) {
        console.error("❌ Error de Conexión:", error.message);
    }
}

testConnection();
