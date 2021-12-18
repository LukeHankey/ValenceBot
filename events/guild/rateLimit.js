export default async (client, rateLimitData) => {
	const { timeout, limit, method, path, route, global } = rateLimitData
	const errorsChannel = client.channels.cache.get('860930368994803732')

	if (timeout > 60000) return	await errorsChannel.send({ content: `\`\`\`The bot is being rate limited:\nTimeout: ${timeout}\nLimit: ${limit}\nMethod: ${method.toUpperCase()}\nPath: ${path}\nRoute: ${route}\nGlobal: ${global}\`\`\`` })
}
