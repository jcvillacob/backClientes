require('dotenv').config();
const fetchAllVehicles = require('../utils/fetchAllVehicles');

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
};

module.exports = cloudFleetController;
