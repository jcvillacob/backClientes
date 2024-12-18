require('dotenv').config();
const mssql = require('mssql');

// * Configuración de la base de datos
const config = {
    user: process.env.USER,
    password: process.env.PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false
    }
};

// * Función para conectar la db
async function getConnection() {
    try {
        const pool = await mssql.connect(config);
        return pool;
    } catch (err) {
        console.error('SQL Server connection error', err);
        throw err;
    }
}

module.exports = {
    getConnection,
    mssql
};