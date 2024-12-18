// insertChecklist.js
const { getConnection, mssql } = require("../../../../../config/db.js");
const moment = require("moment");

const formatDateTime = (dateString) => {
  return moment(dateString).format("YYYY-MM-DD HH:mm:ss");
};

const checkChecklistExists = async (checklistNumber) => {
  try {
    const pool = await getConnection();
    const query = `SELECT COUNT(*) AS count FROM Dev_CD_Checklist WHERE ChecklistNumber = @ChecklistNumber`;
    const result = await pool
      .request()
      .input("ChecklistNumber", mssql.Int, checklistNumber)
      .query(query);
    return result.recordset[0].count > 0;
  } catch (error) {
    console.error("Error al verificar si el checklist existe:", error);
    return true; // Evita inserción accidental si hay un error
  }
};

const insertChecklist = async (checklist, stats) => {
  try {
    const exists = await checkChecklistExists(checklist.number);
    if (exists) {
      /* console.log(
        `El checklist ${checklist.number} ya existe. Omitiendo inserción.`
      ); */
      if (stats) stats.updatedChecklist++;
      return "existing";
    }

    const pool = await getConnection();
    const insertQuery = `
      INSERT INTO Dev_CD_Checklist (
        ChecklistNumber,
        CodigoVehiculo,
        FechaChecklist,
        NombreEstado,
        Inicio,
        Fin,
        DuracionEnMinutes,
        NombreTipo,
        Odometro,
        Horometro,
        NombreConductor,
        NombreCiudad,
        NombreCentroCostos,
        NombreGrupoPrimario,
        FechaCreacion,
        Creador
      ) 
      VALUES (
        @ChecklistNumber,
        @CodigoVehiculo,
        @FechaChecklist,
        @NombreEstado,
        @Inicio,
        @Fin,
        @DuracionEnMinutes,
        @NombreTipo,
        @Odometro,
        @Horometro,
        @NombreConductor,
        @NombreCiudad,
        @NombreCentroCostos,
        @NombreGrupoPrimario,
        @FechaCreacion,
        @Creador
      );
    `;

    await pool
      .request()
      .input("ChecklistNumber", mssql.Int, checklist.number)
      .input("CodigoVehiculo", mssql.VarChar, checklist.vehicle.code)
      .input(
        "FechaChecklist",
        mssql.DateTime,
        formatDateTime(checklist.checklistDate)
      )
      .input("NombreEstado", mssql.VarChar, checklist.status.name)
      .input("Inicio", mssql.DateTime, formatDateTime(checklist.startedAt))
      .input("Fin", mssql.DateTime, formatDateTime(checklist.endedAt))
      .input("DuracionEnMinutes", mssql.Int, checklist.durationInMinutes)
      .input("NombreTipo", mssql.VarChar, checklist.type.name)
      .input("Odometro", mssql.Int, checklist.odometer)
      .input("Horometro", mssql.Int, checklist.hourmeter || 0)
      .input("NombreConductor", mssql.VarChar, checklist.driver.name)
      .input("NombreCiudad", mssql.VarChar, checklist.city?.name || " ")
      .input(
        "NombreCentroCostos",
        mssql.VarChar,
        checklist.costCenter?.name || " "
      )
      .input(
        "NombreGrupoPrimario",
        mssql.VarChar,
        checklist.primaryGroup?.name || " "
      )
      .input(
        "FechaCreacion",
        mssql.DateTime,
        formatDateTime(checklist.createdAt)
      )
      .input("Creador", mssql.VarChar, checklist.createdBy.name)
      .query(insertQuery);

    /* console.log(`Checklist ${checklist.number} insertado correctamente.`); */
    if (stats) stats.newChecklist++;
    return "new";
  } catch (error) {
    console.error(`Error al insertar el checklist ${checklist.number}:`, error);
    return "error";
  }
};

const insertVariables = async (checklist) => {
  try {
    const pool = await getConnection();

    for (const variable of checklist.variables) {
      const checkQuery = `
        SELECT COUNT(*) AS count 
        FROM Dev_CD_ChecklistVariables 
        WHERE ChecklistNumber = @ChecklistNumber AND NombreVariable = @NombreVariable
      `;

      const checkResult = await pool
        .request()
        .input("ChecklistNumber", mssql.Int, checklist.number)
        .input("NombreVariable", mssql.VarChar, variable.name)
        .query(checkQuery);

      if (checkResult.recordset[0].count === 0) {
        const insertQuery = `
          INSERT INTO Dev_CD_ChecklistVariables (
            ChecklistNumber,
            NombreVariable,
            Respuesta,
            NombreGrupo,
            NombreEstado,
            Comentario
          ) 
          VALUES (
            @ChecklistNumber,
            @NombreVariable,
            @Respuesta,
            @NombreGrupo,
            @NombreEstado,
            @Comentario
          );
        `;

        await pool
          .request()
          .input("ChecklistNumber", mssql.Int, checklist.number)
          .input("NombreVariable", mssql.VarChar, variable.name)
          .input("Respuesta", mssql.VarChar, variable.response)
          .input("NombreGrupo", mssql.VarChar, variable.groupName)
          .input("NombreEstado", mssql.VarChar, variable.status.name)
          .input("Comentario", mssql.VarChar, variable.comment || "")
          .query(insertQuery);
      } else {
        /* console.log(
          `La variable ${variable.name} del checklist ${checklist.number} ya existe. Omitiendo inserción.`
        ); */
      }
    }

    /* console.log(
      `Variables del checklist ${checklist.number} insertadas correctamente.`
    ); */
  } catch (error) {
    console.error(
      `Error al insertar las variables del checklist ${checklist.number}:`,
      error
    );
  }
};

module.exports = {
  insertChecklist,
  insertVariables,
};
