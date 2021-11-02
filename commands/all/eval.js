import { inspect } from 'util'
import { Util, Formatters } from 'discord.js'
/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

export default {
	name: 'eval',
	description: ['Evaluates code.'],
	aliases: [''],
	usage: ['<code>'],
	guildSpecific: ['668330890790699079'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, channels) => {
		if (!perms.owner) {
			return message.channel.send(perms.errorO).then(() => {
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
				const split = Util.splitMessage(evalCode)
				return split.forEach(content => message.channel.send({ content: Formatters.codeBlock(content) }))
			} catch (error) {
				return message.channel.send({ content: 'Error:\n' + error })
			}
		}
	}
}
