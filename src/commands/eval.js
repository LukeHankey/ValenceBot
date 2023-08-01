import { inspect } from 'util'
import { codeBlock } from 'discord.js'
import { splitMessage } from '../functions.js'
/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

export default {
	name: 'eval',
	description: ['Evaluates code.'],
	usage: ['<code>'],
	guildSpecific: ['668330890790699079'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, db) => {
		const channels = await db.channels
		if (!perms.owner) {
			return message.channel.send(perms.errorO).then(async () => {
				client.channels.cache.get(channels.logs).send('<@' + message.author.id + '> tried to use eval!')
				return message.reply({ content: 'you wish...', allowedMentions: { repliedUser: false } })
			})
		} else {
			try {
				// eslint-disable-next-line no-eval
				let evalCode = eval(args.join(' '))
				if (typeof evalCode !== 'string') {
					evalCode = inspect(evalCode)
				}
				const split = splitMessage(evalCode)
				return split.forEach((content) => message.channel.send({ content: codeBlock(content) }))
			} catch (error) {
				return message.channel.send({ content: 'Error:\n' + error })
			}
		}
	}
}
