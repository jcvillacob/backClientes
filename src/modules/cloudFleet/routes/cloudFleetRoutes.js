const express = require('express');
const cloudFleetController = require('../controllers/cloudFleetController');
const router = express.Router();

router.get('/vehicles', cloudFleetController.getAllVehicles);
router.get('/work-orders', cloudFleetController.getWorkOrders);
router.get('/work-order', cloudFleetController.getWorkOrder);

module.exports = router;