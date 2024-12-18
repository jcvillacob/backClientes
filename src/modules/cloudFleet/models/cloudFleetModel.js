const { mssql, getConnection } = require("../../../../config/db");
require("dotenv").config();
const tablaBancos = `Prueba_Bancos`;

const cloudFleetModel = {
  getLastDate: async () => {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .query(`SELECT TOP 1 FechaActualizacion 
      FROM Dev_CD_Ordenes
      ORDER BY FechaActualizacion DESC`);
      return result.recordset;
    } catch (err) {
      throw err;
    }
  },
};

module.exports = cloudFleetModel;
