/**
 * Reports a rate limit worth knowing about to the bot's error channel.
 *
 * Both the event name and the payload changed in @discordjs/rest v2: the event
 * is `rateLimited`, not `rateLimit`, and the wait is `timeToReset` rather than
 * `timeout`. The handler was registered under the old name and destructured the
 * old field, so it had two independent reasons never to report anything.
 */
export default async (client, rateLimitData) => {
	const { timeToReset, limit, method, route, url, global } = rateLimitData
	const errorsChannel = client.channels.cache.get('860930368994803732')

	if (!(timeToReset > 60000)) return

	if (!errorsChannel) {
		client.logger?.warn?.(`Rate limited for ${timeToReset}ms on ${route}, but the errors channel is not cached.`)
		return
	}

	return await errorsChannel.send({
		content: `\`\`\`The bot is being rate limited:\nWait: ${timeToReset}ms\nLimit: ${limit}\nMethod: ${method?.toUpperCase()}\nRoute: ${route}\nURL: ${url}\nGlobal: ${global}\`\`\``
	})
}
