const axios = require('axios');

async function fetchWorkOrders(vehicleCode, startDateFrom, startDateTo) {
    const workOrders = [];
    let nextPage = `${process.env.CLOUDFLEET_API_URL}/v2/work-orders`;
    let rateLimitRemaining;
    let rateLimitReset;

    // Build initial query parameters
    const queryParams = new URLSearchParams();

    if (vehicleCode) {
        queryParams.append('vehicleCode', vehicleCode);
    }
    if (startDateFrom) {
        queryParams.append('startDateFrom', startDateFrom);
    }
    if (startDateTo) {
        queryParams.append('startDateTo', startDateTo);
    }

    // Append query parameters to the URL
    if (queryParams.toString()) {
        nextPage += `?${queryParams.toString()}`;
    }

    while (nextPage) {
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

            // Append the retrieved work orders to the array
            workOrders.push(...response.data);

            // Extract pagination and rate limit headers
            const headers = response.headers;
            nextPage = headers['x-nextpage'];
            rateLimitRemaining = parseInt(headers['x-ratelimit-remaining'], 10);
            rateLimitReset = parseInt(headers['x-ratelimit-reset'], 10);

            // Handle rate limiting
            if (rateLimitRemaining <= 0 && rateLimitReset > 0) {
                console.log(`Rate limit reached. Waiting for ${rateLimitReset} seconds before retrying...`);
                await new Promise(resolve => setTimeout(resolve, rateLimitReset * 1000));
            }

        } catch (err) {
            console.error('Error fetching work orders:', err.message);
            throw err;
        }
    }

    // You can perform any additional filtering or mapping here if needed
    // For example, mapping to include only specific fields

    return workOrders;
}

module.exports = fetchWorkOrders;
