const https = require('https');
require('dotenv').config();
const moment = require('moment');
const { getConnection, mssql } = require('../../../../../config/db.js');
const { insertChecklist, insertVariables } = require('./insertChecklist.js');  // Reutiliza el mismo insert

const apiKey = process.env.API_KEY;

async function getLastChecklistDateFromDB() {
  try {
    const pool = await getConnection();
    const query = `SELECT MAX(FechaChecklist) AS lastChecklistDate FROM Dev_CD_Checklist`;
    const result = await pool.request().query(query);

    // Si no hay datos en la tabla, puede ser null
    const lastDate = result.recordset[0].lastChecklistDate;

    if (lastDate) {
      // Ajustar a medianoche
      return moment(lastDate).startOf('day').format('YYYY-MM-DDTHH:mm:ssZ');
    } else {
      // Lógica inicial si la tabla está vacía: un mes atrás al primer día
      return moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm:ssZ');
    }
  } catch (error) {
    console.error('Error al obtener la última fecha de la BD:', error);
    // Fallback
    return moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm:ssZ');
  }
}

async function fetchPage(page, pathUrl, stats) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'fleet.cloudfleet.com',
      path: `/api/v1/checklist?${pathUrl}&page=${page}`,
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
        const responseData = JSON.parse(data);
        console.log(`Página ${page} obtenida: ${responseData.length} resultados`);

        // Inserta checklist y variables DIRECTAMENTE en la BD
        for (const checklist of responseData) {
          await insertChecklist(checklist, stats);   // Inserta checklist
          await insertVariables(checklist, stats);   // Inserta variables
        }

        if (res.headers['x-nextpage']) {
          // Continuar paginación
          setTimeout(() => {
            fetchPage(page + 1, pathUrl, stats).then(resolve).catch(reject);
          }, 2000);
        } else {
          console.log('Se han obtenido todos los objetos e insertado en la BD.');
          resolve();
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error al realizar la solicitud:', error);
      reject(error);
    });

    req.end();
  });
}

async function retrieveData() {
  // 'stats' va a almacenar la cuenta de issues nuevos y actualizados
  const stats = { newChecklist: 0, updatedChecklist: 0 };
  try {
    // 1) Obtenemos última fecha desde la base de datos
    const startDate = await getLastChecklistDateFromDB();
    const endDate = moment().format('YYYY-MM-DDTHH:mm:ssZ');

    const pathUrl = `checklistDateFrom=${startDate}&checklistDateTo=${endDate}`;
    console.log('Recuperando datos desde', startDate, 'Hasta', endDate);

    // 2) Iniciamos paginación en la página 1
    await fetchPage(1, pathUrl, stats);

    // Al terminar la paginación, retornamos stats
    return stats;
  } catch (error) {
    console.error('Error en retrieveData:', error);
    return { newChecklist: 0, updatedChecklist: 0 };
  }
}

module.exports = {
    retrieveData
};