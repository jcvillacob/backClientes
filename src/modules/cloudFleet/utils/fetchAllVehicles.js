const axios = require('axios');

async function fetchAllVehicles(owner) {
    const vehicles = [];
    let nextPage = `${process.env.CLOUDFLEET_API_URL}/v1/vehicles`;
    let rateLimitRemaining;
    let rateLimitReset;

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

            // Append the retrieved vehicles to the array
            vehicles.push(...response.data);

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
            console.error('Error fetching vehicles:', err.message);
            throw err;
        }
    }

    // Filter and map the vehicles as per your requirements
    const filteredVehicles = vehicles
        .filter(vehicle => vehicle.costCenter && vehicle.costCenter.name === owner)
        .map(vehicle => ({
            id: vehicle.id,
            code: vehicle.code,
            typeName: vehicle.typeName
        }));

    return filteredVehicles;
}

module.exports = fetchAllVehicles;
