import Color from '../colors.js'
import { nEmbed, capitalise } from '../functions.js'

export default {
	name: 'help',
	description: ['List all of my commands or info about a specific command.'],
	aliases: ['commands'],
	usage: ['command name'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	run: async (client, message, args, perms, db) => {
		const { commands } = message.client
		const { prefix } = await db.collection.findOne({ _id: message.guild.id }, { projection: { prefix: 1 } })

		if (!args.length) {
			// eslint-disable-next-line array-callback-return
			const com = commands.map(command => {
				// eslint-disable-next-line array-callback-return
				if (command?.type === 'menu') return
				if (command.guildSpecific.includes(message.guild.id) || command.guildSpecific === 'all') {
					switch (perms) {
					default:
						if (perms.owner) {
							if (command.permissionLevel === 'Owner' || command.permissionLevel === 'Admin' || command.permissionLevel === 'Mod' || command.permissionLevel === 'Everyone') return `\`${command.name}\``
						} else if (perms.admin) {
							if (command.permissionLevel === 'Admin' || command.permissionLevel === 'Mod' || command.permissionLevel === 'Everyone') return `\`${command.name}\``
						} else if (perms.mod) {
							if (command.permissionLevel === 'Mod' || command.permissionLevel === 'Everyone') return `\`${command.name}\``
						} else if (command.permissionLevel === 'Everyone') { return `\`${command.name}\`` }
					}
				}
			})
			const join = com.filter(x => x).join('|')

			/**
			 * Check if permission level of the user using the command is equal to that of the permission level for each command per guild.
			 */

			message.channel.send({
				embeds: [nEmbed(
					'**Help Commands List**',
					'Here\'s a list of all my commands:',
					Color.cyan,
					message.author.displayAvatarURL(),
					client.user.displayAvatarURL()
				)
					.addFields([
						{ name: '**Commands:**', value: join, inline: false },
						{ name: `**The bot prefix is: ${prefix}**`, value: `\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`, inline: false }
					])]
			})
		} else {
			const name = args[0]
			const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name))
			if (!command) return
			const otherView = ['Lotto', 'Calendar', 'Profile', 'Dsf', 'Send']

			const cName = capitalise(command.name)
			const fields = []

			for (let i = 0; i < command.usage.length; i++) {
				if (otherView.includes(cName)) {
					const field = { name: `🔹 ${prefix}${cName} ${command.usage[i] || ''}`, value: `${command.description[i]}`, inline: false }
					fields.push(field)
				} else {
					const field = { name: `🔹 ${prefix}${cName} ${command.usage[i] || ''}`, value: `${command.description[i]}`, inline: true }
					fields.push(field)
				}
			}

			message.channel.send({
				embeds: [nEmbed(
					`**Command:** ${cName}`,
					`**Aliases:** ${command.aliases.join(', ') || '[NO ALIASES]'}\n**Permission Level:** ${command.permissionLevel}\n**Usage:**`,
					Color.aqua,
					message.member.user.displayAvatarURL(),
					client.user.displayAvatarURL()
				)
					.addFields(fields)]
			})
		}
	}
}
