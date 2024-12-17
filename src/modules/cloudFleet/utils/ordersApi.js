import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.API_KEY;

export const ExternalApiService = {
  fetchAllOrders: async (startDate, endDate) => {
    let allObjects = [];
    let page = 1;

    // Función interna para obtener datos paginados
    async function fetchData(page) {
      return new Promise((resolve, reject) => {
        const pathUrl = `StartDateFrom=${startDate.toISOString()}&StartDateTo=${endDate.toISOString()}`;
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

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', async () => {
            const responseData = JSON.parse(data);
            allObjects = [...allObjects, ...responseData];

            if (res.headers['x-nextpage']) {
              // Siguiente página
              setTimeout(async () => {
                await fetchData(page + 1);
                resolve();
              }, 2000);
            } else {
              // No hay más páginas
              resolve();
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      });
    }

    await fetchData(page);

    // Ahora obtener detalles de cada orden
    const orderDetailsArray = [];
    for (const [index, order] of allObjects.entries()) {
      const orderDetails = await ExternalApiService.fetchOrderDetails(order.number);
      // Eliminar claves con valores null
      Object.keys(orderDetails).forEach(key => orderDetails[key] === null && delete orderDetails[key]);
      orderDetailsArray.push(orderDetails);
      if (index < allObjects.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return orderDetailsArray;
  },

  fetchOrderDetails: async (orderNumber) => {
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
          const orderDetails = JSON.parse(data);
          resolve(orderDetails);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  },
};
