/* eslint-disable no-shadow */
import { GuildMember, MessageEmbed } from 'discord.js'

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
				name: 'set',
				description: 'Add or remove permissions for a user or role to a slash command.',
				options: [
					{
						type: 3,
						name: 'command',
						description: 'The name of the command to add permissions to.',
						required: true,
						autocomplete: true
					},
					{
						type: 9,
						name: 'mention',
						description: 'The role or user to add to the permissions.',
						required: true
					},
					{
						type: 3,
						name: 'type',
						description: 'The type of setting.',
						required: true,
						choices: [{
							name: 'Add',
							value: 'Add'
						},
						{
							name: 'Remove',
							value: 'Remove'
						}]
					},
					{
						type: 5,
						name: 'value',
						description: 'Allow or deny the role/user permission to use the command.',
						required: true
					}
				]
			},
			{
				type: 1,
				name: 'for',
				description: 'Get current permissions for a specific command.',
				options: [{
					type: 3,
					name: 'command',
					description: 'The name of the command to add permissions to.',
					required: true,
					autocomplete: true
				}]
			}
		],
		default_permission: undefined
	},
	slash: async (interaction, perms, channels) => {
		if (!perms.admin) return interaction.reply(perms.errorA)
		const subType = interaction.options.getSubcommand()
		const commandName = interaction.options.getString('command')

		const commandArray = []
		let guild = true
		let guildCommand = await interaction.client.guilds.cache.get(interaction.guild.id)?.commands.fetch()
		let globalCommands = await interaction.client.application?.commands.fetch()
		guildCommand = guildCommand.filter(com => {
			commandArray.push(com.name)
			if (com.name === commandName) {
				return com
			}
		})
		globalCommands = globalCommands.filter(com => {
			commandArray.push(com.name)
			if (com.name === commandName) {
				guild = false
				return com
			}
		})

		if (!commandArray.includes(commandName)) return interaction.reply({ content: `There is no command by that name. Try one of: \`${commandArray.join(', ')}\``, ephemeral: true })

		switch (subType) {
		case 'set': {
			const userOrRoleId = interaction.options.getMentionable('mention').id
			const userOrRole = interaction.options.getMentionable('mention') instanceof GuildMember ? 'USER' : 'ROLE'
			const value = interaction.options.getBoolean('value')
			const permType = interaction.options.getString('type')
			let guildPerms
			if (guild) guildPerms = await interaction.client.guilds.cache.get(interaction.guild.id)?.commands.fetch(guildCommand.first().permissions.commandId)

			switch (permType) {
			case 'Add': {
				if (guild) {
					await guildPerms.permissions.add({
						permissions: [
							{
								id: userOrRoleId,
								type: userOrRole,
								permission: value
							}
						]
					})
				} else {
					await interaction.guild.commands.permissions.add({
						command: globalCommands.first().permissions.commandId,
						permissions: [
							{
								id: userOrRoleId,
								type: userOrRole,
								permission: value
							}
						]
					})
				}
				interaction.reply({ content: 'Permissions have been set.', ephemeral: true })
			}
				break
			case 'Remove': {
				if (guild && userOrRole === 'ROLE') {
					await guildPerms.permissions.remove({
						command: guildCommand.first().permissions.commandId,
						roles: [userOrRoleId]
					})
				} else if (guild && userOrRole === 'USER') {
					await guildPerms.permissions.remove({
						command: guildCommand.first().permissions.commandId,
						users: [userOrRoleId]
					})
				} else if (userOrRole === 'ROLE') {
					await interaction.guild.commands.permissions.remove({
						command: globalCommands.first().permissions.commandId,
						roles: [userOrRoleId]
					})
				} else {
					await interaction.guild.commands.permissions.remove({
						command: globalCommands.first().permissions.commandId,
						users: [userOrRoleId]
					})
				}
				interaction.reply({ content: 'Permissions have been set.', ephemeral: true })
			}
				break
			}
		}
			break
		case 'for': {
			const cmd = guildCommand.filter(com => com.name === commandName)
			const globCommands = await interaction.client.application?.commands.fetch()
			const gcmd = globCommands.filter(com => com.name === commandName)

			const displayPerms = (perms) => {
				const permList = []
				perms.map(p => {
					const suffix = '>'
					let prefix = '<@!'
					if (p.type === 'ROLE') prefix = '<@&'

					permList.push({ name: `Type: ${p.type}`, value: `${prefix}${p.id}${suffix}\nAccess: ${p.permission ? '✅' : '❌'}`, inline: true })
				})

				const permsEmbed = new MessageEmbed()
					.setTitle(`Permissions for the ${commandName} command.`)
					.setTimestamp()
					.setColor('BLURPLE')
					.setDescription('Full list of permissions. If adding extra roles/users, keep in mind that there is a max limit of 10 users/roles per command.')
					.addFields(permList)

				return permsEmbed
			}

			try {
				if (cmd.size) {
					const perms = await interaction.guild.commands.permissions.fetch({ command: cmd.first().id })
					return interaction.reply({ embeds: [displayPerms(perms)], ephemeral: true })
				}

				const perms = await interaction.guild.commands.permissions.fetch({ command: gcmd.first().id })
				return interaction.reply({ embeds: [displayPerms(perms)], ephemeral: true })
			} catch (err) {
				channels.errors.send(err)
				interaction.reply({ content: `There was an error. ${commandName} either has no permissions set or another error occured.`, ephemeral: true })
			}
		}
		}
	}
}
