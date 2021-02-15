module.exports = async (client, { timeout, limit, method, path, route }) => {
	const info = `Rate limited!
    Timeout: ${timeout}ms,
    Limit: ${limit},
    Method: ${method},
    Path: ${path},
    Route: ${route},
    `;

	console.log(info);
};
