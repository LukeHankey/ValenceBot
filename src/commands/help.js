import Color from '../colors.js'
import { nEmbed, capitalise } from '../functions.js'

export default {
	name: 'help',
	description: ['List all of my commands or info about a specific command.'],
	aliases: ['commands'],
	usage: ['command name'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	run: async (client, message, args, perms) => {
		const db = client.database.settings
		const { commands } = message.client
		const { prefix } = await db.findOne({ _id: message.guild.id }, { projection: { prefix: 1 } })

		if (!args.length) {
			// eslint-disable-next-line array-callback-return
			const slashCommands = []
			const messageCommands = []

			const cTypePush = (cType, name) => {
				if (cType === 'slash') {
					slashCommands.push(name)
				} else {
					messageCommands.push(name)
				}
			}

			commands.forEach((command) => {
				if (command.guildSpecific.includes(message.guild.id) || command.guildSpecific === 'all') {
					const commandType = command.slash ? 'slash' : 'message'

					if (perms.owner) {
						cTypePush(commandType, `\`${command.name}\``)
					} else if (perms.admin) {
						if (
							command.permissionLevel === 'Admin' ||
							command.permissionLevel === 'Mod' ||
							command.permissionLevel === 'Everyone'
						) {
							cTypePush(commandType, `\`${command.name}\``)
						}
					} else if (perms.mod) {
						if (command.permissionLevel === 'Mod' || command.permissionLevel === 'Everyone') {
							cTypePush(commandType, `\`${command.name}\``)
						}
					} else if (command.permissionLevel === 'Everyone') {
						cTypePush(commandType, `\`${command.name}\``)
					}
				}
			})
			const joinSlash = slashCommands.filter((x) => x).join('|')
			const joinMessage = messageCommands.filter((x) => x).join('|')

			/**
			 * Check if permission level of the user using the command is equal to that of the permission level for each command per guild.
			 */

			message.channel.send({
				embeds: [
					nEmbed(
						'**Help Commands List**',
						"Here's a list of all my commands:",
						Color.cyan,
						message.author.displayAvatarURL(),
						client.user.displayAvatarURL()
					).addFields(
						{ name: '**Slash Commands (/):**', value: joinSlash, inline: false },
						{ name: `**Message Commands (${prefix}):**`, value: joinMessage, inline: false },
						{
							name: `**The bot prefix is: ${prefix}**`,
							value: `\nYou can send \`${prefix}help [command name]\` to get info on a specific command!\n\n[Privacy Policy](https://github.com/LukeHankey/ValenceBot/blob/main/PRIVACY_POLICY.md) | [Terms of Service](https://github.com/LukeHankey/ValenceBot/blob/main/TOS.md)`,
							inline: false
						}
					)
				]
			})
		} else {
			const name = args[0]
			const command = commands.get(name) || commands.find((c) => c.aliases && c.aliases.includes(name))
			if (!command) return
			const otherView = ['Lotto', 'Calendar', 'Profile', 'Dsf', 'Send']

			const cName = capitalise(command.name)
			const fields = []

			for (let i = 0; i < command.usage.length; i++) {
				if (otherView.includes(cName)) {
					const field = {
						name: `🔹 ${prefix}${cName} ${command.usage[i] || ''}`,
						value: `${command.description[i]}`,
						inline: false
					}
					fields.push(field)
				} else {
					const field = {
						name: `🔹 ${prefix}${cName} ${command.usage[i] || ''}`,
						value: `${command.description[i]}`,
						inline: true
					}
					fields.push(field)
				}
			}

			message.channel.send({
				embeds: [
					nEmbed(
						`**Command:** ${cName}`,
						`**Aliases:** ${command.aliases ? command?.aliases.join(', ') : '[NO ALIASES]'}\n**Permission Level:** ${
							command.permissionLevel
						}\n**Usage:**`,
						Color.aqua,
						message.member.user.displayAvatarURL(),
						client.user.displayAvatarURL()
					).addFields(fields)
				]
			})
		}
	}
}
