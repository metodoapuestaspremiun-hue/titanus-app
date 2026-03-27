import mysql from 'mysql2/promise';

declare global {
    var mysqlPool: any; // Using any for simplicity as it matches the existing let pool: any
}

export default function getPool() {
    if (!global.mysqlPool) {
        global.mysqlPool = mysql.createPool({
            host: process.env.MYSQL_HOST,
            port: parseInt(process.env.MYSQL_PORT || '43421'),
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            waitForConnections: true,
            connectionLimit: 20,
            queueLimit: 0,
            charset: 'utf8mb4'
        });
    }
    return global.mysqlPool;
}
