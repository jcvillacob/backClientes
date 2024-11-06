require('dotenv').config();
const fetchAllVehicles = require('../utils/fetchAllVehicles');
const fetchWorkOrders = require('../utils/fetchWorkOrders');
const fetchWorkOrder = require('../utils/fetchWorkOrder');

const cloudFleetController = {
    getAllVehicles: async (req, res) => {
        try {
            const { owner } = req.query;
            // Fetch all vehicles using the utility function
            const result = await fetchAllVehicles(owner);
            res.json(result);
        } catch (err) {
            console.error('Error while fetching vehicles:', err.message);
            res.status(500).send('Error while fetching vehicles');
        }
    },

    getWorkOrders: async (req, res) => {
        try {
            const { vehicleCode, startDateFrom, startDateTo } = req.query;

            // Validate required parameters
            if (!vehicleCode || !startDateFrom || !startDateTo) {
                return res.status(400).send('vehicleCode, startDateFrom, and startDateTo are required');
            }
            // Fetch work orders using the utility function
            const workOrders = await fetchWorkOrders(vehicleCode, startDateFrom, startDateTo);
            res.json(workOrders);
        } catch (err) {
            console.error('Error while fetching work orders:', err.message);
            res.status(500).send('Error while fetching work orders');
        }
    },

    getWorkOrder: async (req, res) => {
        try {
            const { workOrder } = req.query;
            // Validate required parameters
            if (!workOrder) {
                return res.status(400).send('work Order is required');
            }

            const work_order = await fetchWorkOrder(workOrder);

            res.json(work_order);
        } catch (err) {
            console.error('Error while fetching work order:', err.message);
            res.status(500).send('Error while fetching work order');
        }
    }
};

module.exports = cloudFleetController;
