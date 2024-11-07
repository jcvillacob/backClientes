const express = require('express');
const app = express();

/* Importar rutas */
const cloudFleetRouter = require('./modules/cloudFleet/routes/cloudFleetRoutes');

// Rutas a cloudFleet
app.use('/cloudfleet', cloudFleetRouter);

module.exports = app;
