/* eslint-disable no-shadow */
import { EmbedBuilder, ApplicationCommandPermissionType } from 'discord.js'
import Color from '../colors.js'

export default {
	name: 'permissions',
	description: ['Assigns a role or user permissions to use a command.'],
	aliases: ['perms'],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	data: {
		name: 'permissions',
		description: 'Assigns a role or user permissions to use a command.',
		options: [
			{
				type: 1,
				name: 'for',
				description: 'Get current permissions for a specific command.',
				options: [
					{
						type: 3,
						name: 'command',
						description: 'The name of the command to add permissions to.',
						required: true,
						autocomplete: true
					}
				]
			}
		],
		default_permission: undefined
	},
	slash: async (interaction, perms, db) => {
		const channels = await db.channels
		if (!perms.admin) return interaction.reply(perms.errorA)
		const subType = interaction.options.getSubcommand()
		const commandName = interaction.options.getString('command')

		const commandArray = []
		// let guild = true
		let guildCommand = await interaction.client.guilds.cache.get(interaction.guild.id)?.commands.fetch()
		const globalCommands = await interaction.client.application?.commands.fetch()
		guildCommand = guildCommand.filter((com) => {
			commandArray.push(com.name)
			if (com.name === commandName) {
				return com
			} else return undefined
		})
		globalCommands.filter((com) => {
			commandArray.push(com.name)
			if (com.name === commandName) {
				// guild = false
				return com
			} else return undefined
		})

		if (!commandArray.includes(commandName)) {
			return interaction.reply({
				content: `There is no command by that name. Try one of: \`${commandArray.join(', ')}\``,
				ephemeral: true
			})
		}

		switch (subType) {
		case 'for': {
			const cmd = guildCommand.filter((com) => com.name === commandName)
			const globCommands = await interaction.client.application?.commands.fetch()
			const gcmd = globCommands.filter((com) => com.name === commandName)

			const displayPerms = (perms) => {
				const permList = perms.map((p) => {
					const suffix = '>'
					let prefix = null
					let permissionType = null
					switch (p.type) {
					case ApplicationCommandPermissionType.Role:
						prefix = '<@&'
						permissionType = 'Role'
						break
					case ApplicationCommandPermissionType.User:
						prefix = '<@!'
						permissionType = 'User'
						break
					case ApplicationCommandPermissionType.Channel:
						prefix = '<#'
						permissionType = 'Channel'
					}

					return {
						name: `Type: ${permissionType}`,
						value: `${prefix}${p.id}${suffix}\nAccess: ${p.permission ? '✅' : '❌'}`,
						inline: true
					}
				})

				const permsEmbed = new EmbedBuilder()
					.setTitle(`Permissions for the ${commandName} command.`)
					.setTimestamp()
					.setColor(Color.gold)
					.setDescription(
						'Full list of permissions. If adding extra roles/users, keep in mind that there is a max limit of 10 users/roles per command.'
					)
					.addFields(permList)

				return permsEmbed
			}

			try {
				if (cmd.size) {
					const perms = await interaction.guild.commands.permissions.fetch({
						command: cmd.first().id
					})
					return interaction.reply({ embeds: [displayPerms(perms)], ephemeral: true })
				}

				const perms = await interaction.guild.commands.permissions.fetch({
					command: gcmd.first().id
				})
				return interaction.reply({ embeds: [displayPerms(perms)], ephemeral: true })
			} catch (err) {
				channels.errors.send(err)
				interaction.reply({
					content: `There was an error. ${commandName} either has no permissions set or another error occured.`,
					ephemeral: true
				})
			}
		}
		}
	}
}
