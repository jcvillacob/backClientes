const express = require('express');
const cloudFleetController = require('../controllers/cloudFleetController');
const router = express.Router();

router.get('/vehicles', cloudFleetController.getAllVehicles);

module.exports = router;