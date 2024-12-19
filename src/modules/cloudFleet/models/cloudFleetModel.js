const { mssql, getConnection } = require("../../../../config/db");
require("dotenv").config();

const cloudFleetModel = {
  insertLogEntry: async () => {
    const pool = await getConnection();
    const result = await pool.request().query(`
      INSERT INTO Dev_CD_CloudFleetLog (message) 
      OUTPUT Inserted.id 
      VALUES ('Sync')
    `);
    return result.recordset[0].id;
  },

  updateLogEntry: async (id, stats) => {
    const pool = await getConnection();
    const {
      newOrders,
      updatedOrders,
      newIssues,
      updatedIssues,
      newChecklists,
      updatedChecklists,
    } = stats;

    await pool
      .request()
      .input("id", mssql.Int, id)
      .input("new_orders", mssql.Int, newOrders)
      .input("updated_orders", mssql.Int, updatedOrders)
      .input("new_issues", mssql.Int, newIssues)
      .input("updated_issues", mssql.Int, updatedIssues)
      .input("new_checklists", mssql.Int, newChecklists)
      .input("updated_checklists", mssql.Int, updatedChecklists).query(`
        UPDATE Dev_CD_CloudFleetLog
        SET hora_final = GETDATE(),
            new_orders = @new_orders,
            updated_orders = @updated_orders,
            new_issues = @new_issues,
            updated_issues = @updated_issues,
            new_checklists = @new_checklists,
            updated_checklists = @updated_checklists
        WHERE id = @id
      `);
  },

  getLastTenLogs: async () => {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT TOP 10 *
      FROM Dev_CD_CloudFleetLog
      ORDER BY hora_inicio DESC
    `);
    return result.recordset;
  },
};

module.exports = cloudFleetModel;
