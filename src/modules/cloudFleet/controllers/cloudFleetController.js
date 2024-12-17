require('dotenv').config();
const cloudFleetModel = require('../models/cloudFleetModel');
//const fetchAllVehicles = require('../utils/fetchAllVehicles');
//const fetchWorkOrders = require('../utils/fetchWorkOrders');
//const fetchWorkOrder = require('../utils/fetchWorkOrder');

const cloudFleetController = {
    getWorkOrders: async (req, res) => {
        try {
            // Fetch all vehicles using the utility function
            const lastDate  = await cloudFleetModel.getLastDate();
            const startDate = lastDate;
            const endDate = new Date();
            res.json(endDate);
        } catch (err) {
            console.error('Error while fetching vehicles:', err.message);
            res.status(500).send('Error while fetching vehicles');
        }
    },
};

module.exports = cloudFleetController;
