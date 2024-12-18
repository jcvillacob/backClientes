const https = require("https");
require("dotenv").config();
const moment = require("moment");
const { getConnection } = require("../../../../../config/db.js");
const { insertOrder } = require("./insertOrders.js");

const apiKey = process.env.API_KEY;

/**
 * Función para obtener la última fecha de orden de la BD.
 * En este ejemplo, usamos 'FechaInicio' de la tabla Dev_CD_Ordenes. Ajusta si necesitas otra columna.
 */
async function getLastOrderDateFromDB() {
  try {
    const pool = await getConnection();
    // Consulta la máxima fecha de tu columna preferida (p.ej. FechaInicio, FechaCreacion, etc.)
    const query = `SELECT MAX(FechaInicio) AS lastOrderDate FROM Dev_CD_Ordenes;`;
    const result = await pool.request().query(query);

    const lastDate = result.recordset[0].lastOrderDate;
    if (lastDate) {
      // Ajustar a medianoche para la nueva consulta
      return moment(lastDate).startOf("day").format("YYYY-MM-DDTHH:mm:ssZ");
    } else {
      // Si la tabla está vacía, por ejemplo, tomamos un mes atrás
      return moment()
        .subtract(1, "month")
        .startOf("month")
        .format("YYYY-MM-DDTHH:mm:ssZ");
    }
  } catch (error) {
    console.error(
      "Error al obtener la última fecha de órdenes en la BD:",
      error
    );
    // Fallback si hubo error
    return moment()
      .subtract(1, "month")
      .startOf("month")
      .format("YYYY-MM-DDTHH:mm:ssZ");
  }
}

/**
 * fetchOrderDetails(orderNumber)
 * Obtiene el detalle completo de una Orden, dado su número, desde la API.
 */
function fetchOrderDetails(orderNumber) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      hostname: "fleet.cloudfleet.com",
      path: `/api/v1/work-orders/${orderNumber}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const orderDetails = JSON.parse(data);
          // Opcional: eliminar claves con valor null
          Object.keys(orderDetails).forEach(
            (key) => orderDetails[key] === null && delete orderDetails[key]
          );
          resolve(orderDetails);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", (error) => {
      console.error(
        `Error al obtener detalle de la orden ${orderNumber}:`,
        error
      );
      reject(error);
    });

    req.end();
  });
}

/**
 * fetchOrdersPage(page, pathUrl, stats)
 * Función recursiva para obtener una página de órdenes y procesarlas.
 * - 'stats' es un objeto que acumula 'newOrders' y 'updatedOrders'.
 */
function fetchOrdersPage(page, pathUrl, stats) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      hostname: "fleet.cloudfleet.com",
      path: `/api/v1/work-orders?${pathUrl}&page=${page}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, async (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", async () => {
        try {
          const responseData = JSON.parse(data);
          console.log(
            `Página ${page} obtenida: ${responseData.length} resultados`
          );

          // Procesar cada orden resumida en esta página
          for (let i = 0; i < responseData.length; i++) {
            const orderSummary = responseData[i];
            const orderNumber = orderSummary.number;

            // 1) Obtener el detalle completo de la orden
            const orderDetails = await fetchOrderDetails(orderNumber);

            // 2) Insertar/actualizar en BD, incrementando stats
            await insertOrder(orderDetails, stats);

            // 3) Retraso de 2s (opcional) entre cada orden para no saturar la API
            if (i < responseData.length - 1) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          }

          // Verificar paginación
          if (res.headers["x-nextpage"]) {
            // Si hay siguiente página, llamamos recursivamente
            setTimeout(() => {
              fetchOrdersPage(page + 1, pathUrl, stats)
                .then(resolve)
                .catch(reject);
            }, 2000);
          } else {
            console.log(
              "Se han procesado todas las órdenes. Inserción/actualización en BD completada."
            );
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error al obtener la página de órdenes:", error);
      reject(error);
    });

    req.end();
  });
}

/**
 * retrieveOrders()
 * Función principal para recuperar e insertar TODAS las órdenes dentro de cierto rango de fechas.
 * - Crea un objeto stats = { newOrders: 0, updatedOrders: 0 } para llevar la cuenta de inserciones y actualizaciones.
 * - Obtiene la última fecha desde la BD para startDate.
 * - Llama paginación en fetchOrdersPage(1, pathUrl, stats).
 * - Retorna stats al finalizar.
 */
async function retrieveOrders() {
  const stats = { newOrders: 0, updatedOrders: 0 };

  try {
    const startDate = await getLastOrderDateFromDB();
    const endDate = moment().format("YYYY-MM-DDTHH:mm:ssZ");
    const pathUrl = `StartDateFrom=${startDate}&StartDateTo=${endDate}`;

    console.log(`Recuperando órdenes desde ${startDate} hasta ${endDate}`);
    await fetchOrdersPage(1, pathUrl, stats);

    // Al terminar todo el proceso, retornamos stats con los totales
    return stats;
  } catch (error) {
    console.error("Error en retrieveOrders:", error);
    return stats; // retornamos lo que tengamos, incluso si ocurrió error
  }
}


module.exports = {
  retrieveOrders
};