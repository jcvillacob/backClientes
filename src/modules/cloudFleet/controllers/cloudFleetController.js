require("dotenv").config();
const { retrieveOrders } = require("../utils/orders/fetchOrders.js");
const { retrieveIssues } = require("../utils/issues/fetchIssues.js");
const { retrieveData } = require("../utils/checklist/fetchChecklist.js");
const {
  insertLogEntry,
  updateLogEntry,
  getLastTenLogs,
} = require("../models/cloudFleetModel.js");

const retryOperation = async (operation, retries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      if (attempt === retries) throw lastError;
    }
  }
};

const cloudFleetController = {
  getWorkOrders: async (req, res) => {
    try {
      // Insertamos el log inicial
      const logId = await insertLogEntry();

      // Sincronizo Órdenes con reintentos
      const ordersStats = await retryOperation(retrieveOrders);
      console.log("Terminadas las Ordenes");

      // Sincronizo Issues con reintentos
      const issuesStats = await retryOperation(retrieveIssues);
      console.log("Terminados los Issues");

      // Sincronizo Checklists con reintentos
      const checklistStats = await retryOperation(retrieveData);
      console.log("Terminados los Checklists");

      // Actualizamos el log
      await updateLogEntry(logId, {
        newOrders: ordersStats.newOrders,
        updatedOrders: ordersStats.updatedOrders,
        newIssues: issuesStats.newIssues,
        updatedIssues: issuesStats.updatedIssues,
        newChecklists: checklistStats.newChecklist,
        updatedChecklists: checklistStats.updatedChecklist,
      });

      res.json({
        message: "Sync completed",
        newOrders: ordersStats.newOrders,
        updatedOrders: ordersStats.updatedOrders,
        newIssues: issuesStats.newIssues,
        updatedIssues: issuesStats.updatedIssues,
        newChecklists: checklistStats.newChecklist,
        updatedChecklists: checklistStats.updatedChecklist,
      });
    } catch (err) {
      console.error("Error while syncing data:", err.message);
      res.status(500).send("Error while syncing data");
    }
  },

  getLastTenLogs: async (req, res) => {
    try {
      const logs = await getLastTenLogs();
      res.json({
        message: "Last 10 sync records",
        data: logs,
      });
    } catch (err) {
      console.error("Error while fetching last 10 logs:", err.message);
      res.status(500).send("Error while fetching last 10 logs");
    }
  },
};

module.exports = cloudFleetController;
