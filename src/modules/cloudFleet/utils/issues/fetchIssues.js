// fetchIssues.js
const https = require("https");
const dotenv = require("dotenv");
const moment = require("moment");
const { insertIssue, insertLabor } = require("./insertIssuesSQL.js");
const { getConnection, mssql } = require("../../../../../config/db.js");

dotenv.config();
const apiKey = process.env.API_KEY;

/**
 * Obtiene la última fecha de novedad (FechaReporte) de la tabla Dev_CD_NovedadesMantenimiento.
 * Retorna esa fecha en formato 'YYYY-MM-DDTHH:mm:ssZ' o, si no hay datos, un fallback.
 */
async function getLastIssueDateFromDB() {
  try {
    const pool = await getConnection();
    const query = `SELECT MAX(FechaReporte) AS lastIssueDate FROM Dev_CD_NovedadesMantenimiento`;
    const result = await pool.request().query(query);

    const lastDate = result.recordset[0].lastIssueDate;
    if (lastDate) {
      // Ajustar a medianoche
      return moment(lastDate).startOf("day").format("YYYY-MM-DDTHH:mm:ssZ");
    } else {
      // Si la tabla está vacía, coge un fallback, p. ej. 1 mes atrás
      return moment()
        .subtract(1, "month")
        .startOf("month")
        .format("YYYY-MM-DDTHH:mm:ssZ");
    }
  } catch (error) {
    console.error("Error al obtener la última fecha de Issues en la BD:", error);
    // Fallback
    return moment()
      .subtract(1, "month")
      .startOf("month")
      .format("YYYY-MM-DDTHH:mm:ssZ");
  }
}

/**
 * Petición recursiva para cada página de la API.
 * 'stats' se pasa a insertIssue para contar newIssues / updatedIssues
 */
function fetchIssuesPage(page, pathUrl, stats) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      hostname: "fleet.cloudfleet.com",
      path: `/api/v1/issues?${pathUrl}&page=${page}`,
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

      res.on("end", async () => {
        try {
          const responseData = JSON.parse(data);
          console.log(`Página ${page} obtenida: ${responseData.length} resultados`);

          // Insertar cada issue en la BD al vuelo
          for (const issue of responseData) {
            // insertIssue ahora recibe stats para aumentar el conteo
            await insertIssue(issue, stats);

            if (issue.associatedLabor) {
              // Labor no afecta stats de issues, pues es una tabla diferente
              await insertLabor(issue.associatedLabor, issue.number);
            }
          }

          // Verificar si hay x-nextpage
          if (res.headers["x-nextpage"]) {
            // Paginación recursiva
            setTimeout(() => {
              fetchIssuesPage(page + 1, pathUrl, stats).then(resolve).catch(reject);
            }, 2000);
          } else {
            console.log("Se han obtenido todas las issues de la API y se insertaron en la BD.");
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error al realizar la solicitud:", error);
      reject(error);
    });

    req.end();
  });
}

/**
 * Función principal para recuperar e insertar Issues.
 */
async function retrieveIssues() {
  // 'stats' va a almacenar la cuenta de issues nuevos y actualizados
  const stats = { newIssues: 0, updatedIssues: 0 };

  try {
    const startDate = await getLastIssueDateFromDB();
    const endDate = moment().format("YYYY-MM-DDTHH:mm:ssZ");

    // Ajustar los parámetros de la API según tus necesidades
    const pathUrl = `createdAtFrom=${startDate}&createdAtTo=${endDate}&includeDone=all`;

    console.log(`Recuperando issues desde ${startDate} hasta ${endDate}.`);

    // Iniciar paginación en la página 1, pasándole 'stats'
    await fetchIssuesPage(1, pathUrl, stats);

    // Al terminar la paginación, retornamos stats
    return stats;
  } catch (error) {
    console.error("Error en retrieveIssues:", error);
    return { newIssues: 0, updatedIssues: 0 };
  }
}

module.exports = {
  retrieveIssues,
};
