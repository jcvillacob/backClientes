const swaggerJSDoc = require('swagger-jsdoc');

// Definición básica de Swagger
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'API de CloudFleet',
        version: '1.0.0',
        description: 'Documentación de la API para los servicios de CloudFleet',
    },
    servers: [
        /* {
            url: 'http://localhost:{port}/api/v1/',
            description: 'Servidor local',
            variables: {
                port: {
                    enum: ['4000', '3000'],
                    default: '4000',
                },
            },
        }, */
        {
            url: 'http://localhost:{port}/api/v1/cloudfleet/',
            description: 'Servidor local',
            variables: {
                port: {
                    enum: ['4000', '3000'],
                    default: '4000',
                },
            },
        },
    ],
};

// Opciones para los documentos de Swagger
const options = {
    swaggerDefinition,
    apis: [
        './src/modules/cloudFleet/controllers/*.js', // Asegúrate de que esta ruta es correcta
    ],
};

// Inicializar swagger-jsdoc
const swaggerSpecs = swaggerJSDoc(options);

module.exports = swaggerSpecs;
