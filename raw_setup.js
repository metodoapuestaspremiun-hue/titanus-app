require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function setup() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: parseInt(process.env.MYSQL_PORT),
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });

        console.log("Conectado. Creando tablas...");

        const queries = [
            `CREATE TABLE IF NOT EXISTS clientes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                telefono VARCHAR(20) NOT NULL UNIQUE,
                fecha_vencimiento DATE,
                fecha_nacimiento DATE,
                deuda DECIMAL(10, 2) DEFAULT 0,
                inasistencias INTEGER DEFAULT 0,
                ultima_asistencia DATE,
                estado VARCHAR(20) DEFAULT 'activo',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS configuracion (
                id INT AUTO_INCREMENT PRIMARY KEY,
                clave VARCHAR(100) UNIQUE NOT NULL,
                valor TEXT,
                descripcion TEXT,
                fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS cola_mensajes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(255),
                telefono VARCHAR(20),
                tipo VARCHAR(50),
                mensaje TEXT,
                estado VARCHAR(20) DEFAULT 'pendiente',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_envio TIMESTAMP NULL DEFAULT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS media (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                content LONGBLOB NOT NULL,
                mimetype VARCHAR(100),
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const q of queries) {
            await connection.execute(q);
            console.log("Tabla o consulta ejecutada.");
        }

        await connection.end();
        console.log("Hecho!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}

setup();
