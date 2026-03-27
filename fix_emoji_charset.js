const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env.local' });

async function fixCharset() {
    console.log("🚀 Starting character set migration...");
    
    // Fallback names from .env.local if needed
    const dbHost = process.env.MYSQL_HOST || process.env.DB_HOST;
    const dbUser = process.env.MYSQL_USER || process.env.DB_USER;
    const dbPassword = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
    const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME;
    const dbPort = parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '43421');

    if (!dbHost || !dbUser || !dbName) {
        console.error("❌ Missing database credentials in environment variables.");
        process.exit(1);
    }

    try {
        const connection = await mysql.createConnection({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPassword,
            database: dbName
        });

        console.log(`✅ Connected to database: ${dbName}`);

        // 1. Convert Database
        console.log(`🛠 Converting database ${dbName} to utf8mb4...`);
        await connection.execute(`ALTER DATABASE \`${dbName}\` CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`);

        // 2. Identify tables to convert
        const tables = ['configuracion', 'cola_mensajes', 'clientes'];
        
        for (const table of tables) {
            console.log(`🛠 Converting table \`${table}\` to utf8mb4...`);
            try {
                // First convert the table itself
                await connection.execute(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                console.log(`✅ Table \`${table}\` converted successfully.`);
            } catch (err) {
                console.warn(`⚠️ Could not convert table \`${table}\`: ${err.message}`);
            }
        }

        console.log("✨ Migration completed successfully!");
        await connection.end();
    } catch (error) {
        console.error("❌ Error during migration:", error.message);
        process.exit(1);
    }
}

fixCharset();
