export default async (client, rateLimitData) => {
	const { timeout, limit, method, path, route, global } = rateLimitData
	const errorsChannel = client.channels.cache.get('860930368994803732')

	await errorsChannel.send({ content: `The bot is being rate limited:\nTimeout: ${timeout}}\nLimit: ${limit}\nMethod: ${method}\nPath: ${path}\nRoute: ${route}\nGlobal: ${global}` })
}
