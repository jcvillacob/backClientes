require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./src/documentation/swaggerConfig");
// const { connectToDatabase } = require('./config/db');
const { getConnection } = require("./config/db");
const appRouter = require("./src/index");

const app = express();

// Conexión a la base de datos
async function startServer() {
  try {
    // Conexión a la base de datos
    getConnection()
      .then()
      .catch((err) => {
        console.error(
          "No se pudo establecer la conexión a la base de datos:",
          err
        );
        process.exit(1);
      });
    console.log("Conexión a la base de datos establecida correctamente.");

    // Configuración de middlewares
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));

    // Habilitar CORS
    app.use(cors());

    // Montar el router base
    app.use("/api/v1", appRouter);

    // Documentación de la API con Swagger
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

    // Manejo de errores
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ message: "Algo salió mal!" });
    });

    const PORT = process.env.PORT || 3000;

    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    console.error("No se pudo establecer la conexión a la base de datos:", err);
    process.exit(1);
  }
}

startServer();
