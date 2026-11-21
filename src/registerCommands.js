import { contextMenuData, contextMenuGuilds } from './handlers/interactions/contextMenu.js'

/**
 * What to register: guildSpecific 'all' goes global, anything else goes to
 * each guild it names. A guild only ever named here (no command left for it)
 * is not visited, so its old commands stay until removed by hand.
 */
export const planRegistration = (commands) => {
	const global = []
	const guilds = new Map(contextMenuGuilds.map((id) => [id, [...contextMenuData]]))
	for (const command of commands) {
		if (!command.data || !command.slash) continue
		if (command.guildSpecific === 'all') {
			global.push(command.data)
			continue
		}
		for (const id of [].concat(command.guildSpecific)) {
			guilds.set(id, [...(guilds.get(id) ?? []), command.data])
		}
	}
	return { global, guilds }
}

/**
 * Replaces the app's registered commands with the ones in the code, on every
 * start, so Discord cannot drift from the repo. A failure is logged rather
 * than thrown: the bot is still useful with stale commands.
 */
export const registerCommands = async (client) => {
	const { global, guilds } = planRegistration(client.commands.values())
	const targets = [[null, global], ...guilds]
	for (const [guildId, data] of targets) {
		const where = guildId ?? 'global'
		try {
			const set = guildId
				? await client.application.commands.set(data, guildId)
				: await client.application.commands.set(data)
			client.logger.info(`Registered ${set.size} command(s) in ${where}: ${set.map((c) => c.name).join(', ')}`)
		} catch (err) {
			client.logger.error(`Could not register commands in ${where}: ${err.message}`)
		}
	}
}
