// insertIssuesSQL.js
const { getConnection, mssql } = require('../../../../../config/db.js');
const moment = require('moment');

// Formatea la fecha/hora para SQL Server
const formatDateTime = (dateString) => {
  return moment(dateString).format('YYYY-MM-DD HH:mm:ss');
};

const checkIssueExists = async (issueNumber) => {
  try {
    const pool = await getConnection();
    const query = `SELECT COUNT(*) AS count FROM Dev_CD_NovedadesMantenimiento WHERE Numero = @Numero`;
    const result = await pool
      .request()
      .input('Numero', mssql.Int, issueNumber)
      .query(query);
    return result.recordset[0].count > 0;
  } catch (error) {
    console.error('Error al verificar si la novedad existe:', error);
    // Como fallback, retornamos true para no forzar inserción en caso de error
    return true;
  }
};

const checkLaborExists = async (idLabor) => {
  try {
    const pool = await getConnection();
    const query = `SELECT COUNT(*) AS count FROM Dev_CD_LaborAsociada WHERE IdLabor = @IdLabor`;
    const result = await pool
      .request()
      .input('IdLabor', mssql.Int, idLabor)
      .query(query);
    return result.recordset[0].count > 0;
  } catch (error) {
    console.error('Error al verificar si la labor existe:', error);
    return true;
  }
};

// Inserta la novedad en la base de datos
// -> Retorna un string para indicar si fue "new" o "existing"
async function insertIssue(issue, stats) {
  try {
    const pool = await getConnection();
    const exists = await checkIssueExists(issue.number);

    if (exists) {
      /* console.log(`La novedad ${issue.number} ya existe. Omitiendo inserción.`); */
      // Interpretamos "ya existía" como "actualizado" (aunque no hagas UPDATE).
      if (stats) stats.updatedIssues++;
      return "existing";
    }

    const safeFormatDateTime = (date) => {
      if (!date) return '';
      const formattedDate = moment(date);
      return formattedDate.isValid()
        ? formattedDate.format('YYYY-MM-DD HH:mm:ss')
        : '';
    };

    const reportedAt = safeFormatDateTime(issue.reportedAt);
    const doneAt     = safeFormatDateTime(issue.doneAt);
    const createdAt  = safeFormatDateTime(issue.createdAt);

    // Si doneAt es vacío, lo guardamos como VarChar vacío
    const processedDoneAt = doneAt ? formatDateTime(doneAt) : '';

    const insertQuery = `
      INSERT INTO Dev_CD_NovedadesMantenimiento (
        Numero,
        CodigoVehiculo,
        FechaReporte,
        Reporte,
        Prioridad,
        Odometro,
        Comentario,
        Hecho,
        FechaHecho,
        NumeroOrdenTrabajo,
        CreadoPor,
        FechaCreacion,
        NumeroChecklist
      ) 
      VALUES (
        @Numero,
        @CodigoVehiculo,
        @FechaReporte,
        @Reporte,
        @Prioridad,
        @Odometro,
        @Comentario,
        @Hecho,
        @FechaHecho,
        @NumeroOrdenTrabajo,
        @CreadoPor,
        @FechaCreacion,
        @NumeroChecklist
      );
    `;

    const Done = issue.isDone ? 'Sí' : 'No'; 

    await pool.request()
      .input('Numero', mssql.Int, issue.number)
      .input('CodigoVehiculo', mssql.VarChar, issue.vehicleCode)
      .input('FechaReporte', mssql.DateTime, reportedAt)
      .input('Reporte', mssql.VarChar, issue.reporter?.name || ' ')
      .input('Prioridad', mssql.VarChar, issue.priority || ' ')
      .input('Odometro', mssql.Int, issue.odometer || 0)
      // .input('Horometro', mssql.Int, issue.hourmeter || 0) // si lo necesitas
      .input('Comentario', mssql.Text, issue.comment || '')
      .input('Hecho', mssql.VarChar, Done)
      .input(
        'FechaHecho',
        processedDoneAt ? mssql.DateTime : mssql.VarChar,
        processedDoneAt
      )
      .input('NumeroOrdenTrabajo', mssql.Int, issue.workOrderDoneNumber || 0)
      .input('CreadoPor', mssql.VarChar, issue.createdBy?.name || ' ')
      .input('FechaCreacion', mssql.DateTime, createdAt)
      .input('NumeroChecklist', mssql.Int, issue.fromChecklistNumber || 0)
      .query(insertQuery);

    /* console.log(`Novedad ${issue.number} insertada correctamente.`); */

    if (stats) stats.newIssues++;
    return "new";
  } catch (error) {
    console.error(`Error al insertar la novedad ${issue.number}:`, error);
    return "error";
  }
};

// Inserta la labor asociada
async function insertLabor(labor, issueNumber) {
  try {
    const pool = await getConnection();
    const exists = await checkLaborExists(labor.id);

    if (exists) {
      /* console.log(`La labor asociada ${labor.id} ya existe. Omitiendo inserción.`); */
      return "existing";
    }

    const insertQuery = `
      INSERT INTO Dev_CD_LaborAsociada (
        IdLabor,
        NumeroNovedad,
        NombreLabor
      ) 
      VALUES (
        @IdLabor,
        @NumeroNovedad,
        @NombreLabor
      );
    `;

    await pool.request()
      .input('IdLabor', mssql.Int, labor.id)
      .input('NumeroNovedad', mssql.Int, issueNumber)
      .input('NombreLabor', mssql.VarChar, labor.name)
      .query(insertQuery);

    /* console.log(`Labor asociada ${labor.id} insertada correctamente.`); */
    return "new";
  } catch (error) {
    console.error(`Error al insertar la labor asociada ${labor.id}:`, error);
    return "error";
  }
};

module.exports = {
  insertIssue,
  insertLabor
};
