const express = require('express');
const router = express.Router();

// Define tus rutas aquí
router.get('/status', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

// Exporta el router
module.exports = router;
