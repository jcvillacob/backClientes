const axios = require('axios');

async function fetchWorkOrder(workOrder) {
    let workOrders = {};
    let nextPage = `${process.env.CLOUDFLEET_API_URL}/v1/work-orders`;
    if (workOrder) {
        nextPage += `/${workOrder}`;
    }

    try {
        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: nextPage,
            headers: {
                'Authorization': `Bearer ${process.env.API_KEY_CDS}`,
                'Content-Type': 'application/json; charset=utf-8'
            }
        };

        const response = await axios(config);
        workOrders = response.data;
    } catch (err) {
        console.error('Error fetching work orders:', err.message);
        throw err;
    }

    // You can perform any additional filtering or mapping here if needed
    // For example, mapping to include only specific fields

    return workOrders;
}

module.exports = fetchWorkOrder;
