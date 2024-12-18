const express = require('express');
const cloudFleetController = require('../controllers/cloudFleetController');
const router = express.Router();

router.get('/work-orders', cloudFleetController.getWorkOrders);
router.get('/work-orders/last-logs', cloudFleetController.getLastTenLogs);

module.exports = router;
