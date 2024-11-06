require('dotenv').config();
const { Sequelize } = require('sequelize');

// * Configuración de Sequelize para SQL Server
const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.USER, process.env.PASSWORD, {
    host: process.env.DB_SERVER,
    dialect: 'mssql',
    dialectOptions: {
        options: {
            encrypt: false, // Configuración para SQL Server, ajustar si es necesario
        },
    },
    logging: false, // Puedes habilitar logging para depuración
});

// * Función para conectar y verificar la conexión a la base de datos
async function connectToDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Connection to SQL Server has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    connectToDatabase
};
