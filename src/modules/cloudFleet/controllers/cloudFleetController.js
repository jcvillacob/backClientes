require('dotenv').config();
const { retrieveOrders } = require('../utils/orders/fetchOrders.js'); 
const { retrieveIssues } = require('../utils/issues/fetchIssues.js');
const { retrieveData } = require('../utils/checklist/fetchChecklist.js');

const cloudFleetController = {
  getWorkOrders: async (req, res) => {
    try {
      // 1) Sincronizo Work Orders
      const ordersStats = await retrieveOrders();
      console.log("Terminadas las Ordenes");
      // 2) Sincronizo Issues
      const issuesStats = await retrieveIssues();
      console.log("Terminados los Issues");
      // 3) Sincronizo Checklist
      const checklistStats = await retrieveData();
      console.log("Terminados los Checklists");

      // Combino o regreso por separado
      res.json({
        message: 'Sync completed',
        // Órdenes
        newOrders: ordersStats.newOrders,
        updatedOrders: ordersStats.updatedOrders,
        // Issues
        newIssues: issuesStats.newIssues,
        updatedIssues: issuesStats.updatedIssues,
        // Checklist
        newChecklists: checklistStats.newChecklist,
        updatedChecklists: checklistStats.updatedChecklist
      });
    } catch (err) {
      console.error('Error while syncing data:', err.message);
      res.status(500).send('Error while syncing data');
    }
  },
};

module.exports = cloudFleetController;
