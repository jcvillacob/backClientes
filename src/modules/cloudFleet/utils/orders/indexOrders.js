const { retrieveOrders } = require('./fetchOrders.js');

async function runOrdersSync() {
  try {
    console.log('=== Iniciando proceso de sincronización de Órdenes ===');
    await retrieveOrders();
    console.log('=== Proceso de Órdenes finalizado ===');
  } catch (error) {
    console.error('Error en la ejecución de Órdenes:', error);
  }
}

runOrdersSync();
