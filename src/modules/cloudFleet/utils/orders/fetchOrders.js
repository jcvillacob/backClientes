// fetchOrders.js
import https from 'https';
import dotenv from 'dotenv';
import moment from 'moment';
import { getConnection } from '../../db.js'; // Ajusta la ruta a tu archivo db.js
import { insertOrder } from './insertOrders.js'; // Ajusta ruta según tu estructura

dotenv.config();
const apiKey = process.env.API_KEY;

/**
 * getLastOrderDateFromDB()
 * Consulta la tabla Dev_CD_Ordenes para obtener la última fecha de inserción.
 * En este ejemplo, uso la columna FechaInicio como referencia. Ajusta si necesitas otra.
 */
async function getLastOrderDateFromDB() {
  try {
    const pool = await getConnection();
    // Consulta la máxima fecha de tu columna preferida (FechaInicio, FechaCreacion, etc.)
    const query = `SELECT MAX(FechaInicio) AS lastOrderDate FROM Dev_CD_Ordenes;`;
    const result = await pool.request().query(query);

    const lastDate = result.recordset[0].lastOrderDate;
    if (lastDate) {
      // Ajusta a medianoche para la nueva consulta
      return moment(lastDate).startOf('day').format('YYYY-MM-DDTHH:mm:ssZ');
    } else {
      // Si la tabla está vacía, por ejemplo, tomamos un mes atrás
      return moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm:ssZ');
    }
  } catch (error) {
    console.error('Error al obtener la última fecha de órdenes en la BD:', error);
    // Fallback si hubo error
    return moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm:ssZ');
  }
}

/**
 * fetchOrderDetails(orderNumber)
 * Obtiene el detalle completo de una Orden, dado su número, desde la API.
 */
function fetchOrderDetails(orderNumber) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'fleet.cloudfleet.com',
      path: `/api/v1/work-orders/${orderNumber}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const orderDetails = JSON.parse(data);
          // Opcional: eliminar claves con null
          Object.keys(orderDetails).forEach(
            (key) => orderDetails[key] === null && delete orderDetails[key]
          );
          resolve(orderDetails);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Error al obtener detalle de la orden ${orderNumber}:`, error);
      reject(error);
    });

    req.end();
  });
}

/**
 * fetchOrdersPage(page, pathUrl)
 * Función recursiva para obtener una página de órdenes.
 * Tras recibir la lista resumida, por cada orden invocamos fetchOrderDetails().
 */
function fetchOrdersPage(page, pathUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'fleet.cloudfleet.com',
      path: `/api/v1/work-orders?${pathUrl}&page=${page}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, async (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const responseData = JSON.parse(data);
          console.log(`Página ${page} obtenida: ${responseData.length} resultados`);

          // Por cada orden resumida de esta página, obtén el detalle y luego insértala en la BD
          for (let i = 0; i < responseData.length; i++) {
            const orderSummary = responseData[i];
            const orderNumber = orderSummary.number;

            console.log(`Recuperando detalle de orden ${orderNumber} (orden ${i+1}/${responseData.length} de la página ${page})...`);
            const orderDetails = await fetchOrderDetails(orderNumber);
            await insertOrder(orderDetails);

            // Retraso de 2s entre cada orden (opcional, para no saturar la API)
            if (i < responseData.length - 1) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          }

          // Verificar paginación
          if (res.headers['x-nextpage']) {
            // Si hay siguiente página, llamamos recursivamente
            setTimeout(() => {
              fetchOrdersPage(page + 1, pathUrl).then(resolve).catch(reject);
            }, 2000);
          } else {
            console.log('Se han obtenido todas las órdenes y se han insertado/actualizado en la BD.');
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error al obtener la página de órdenes:', error);
      reject(error);
    });

    req.end();
  });
}

/**
 * retrieveOrders()
 * Función principal para recuperar e insertar TODAS las órdenes del rango de fechas.
 *  - Llama a getLastOrderDateFromDB() para obtener fecha de inicio
 *  - Asigna la fecha de fin como el momento actual
 *  - Construye pathUrl y llama fetchOrdersPage(1, pathUrl)
 */
export async function retrieveOrders() {
  try {
    const startDate = await getLastOrderDateFromDB();
    const endDate = moment().format('YYYY-MM-DDTHH:mm:ssZ');

    // Ajusta parámetros de la API segun tu endpoint
    const pathUrl = `StartDateFrom=${startDate}&StartDateTo=${endDate}`;
    console.log(`Recuperando órdenes desde ${startDate} hasta ${endDate}`);

    // Iniciar paginación en la página 1
    await fetchOrdersPage(1, pathUrl);
  } catch (error) {
    console.error('Error en retrieveOrders:', error);
  }
}
