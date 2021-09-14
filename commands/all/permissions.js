/* eslint-disable no-shadow */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { GuildMember, MessageEmbed } = require('discord.js');

module.exports = {
	name: 'permissions',
	description: ['Assigns a role or user permissions to use a command.'],
	aliases: ['perms'],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('permissions')
		.setDescription('Assigns a role or user permissions to use a command.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('set')
				.setDescription('Add or remove permissions for a user or role to a slash command.')
				.addStringOption(option =>
					option
						.setName('command')
						.setDescription('The name of the command to add permissions to.')
						.setRequired(true),
				)
				.addMentionableOption(option =>
					option
						.setName('mention')
						.setDescription('The role or user to add to the permissions.')
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('type')
						.setDescription('The type of setting.')
						.addChoices([
							['Add', 'Add'],
							['Remove', 'Remove'],
						])
						.setRequired(true),
				)
				.addBooleanOption(option =>
					option
						.setName('value')
						.setDescription('Allow or deny the role/user permission to use the command.')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('for')
				.setDescription('Get current permissions for a specific command.')
				.addStringOption(option =>
					option
						.setName('command')
						.setDescription('The name of the command to add permissions to.')
						.setRequired(true),
				),
		),
	slash: async (interaction, perms, channels) => {
		if (!perms.admin) return interaction.reply(perms.errorA);
		const subType = interaction.options.getSubcommand();
		const commandName = interaction.options.getString('command');

		const commandArray = [];
		let guild = true;
		let guildCommand = await interaction.client.guilds.cache.get(interaction.guild.id)?.commands.fetch();
		let globalCommands = await interaction.client.application?.commands.fetch();
		guildCommand = guildCommand.filter(com => {
			commandArray.push(com.name);
			if (com.name === commandName) {
				return com;
			}
		});
		globalCommands = globalCommands.filter(com => {
			commandArray.push(com.name);
			if (com.name === commandName) {
				guild = false;
				return com;
			}
		});

		if (!commandArray.includes(commandName)) return interaction.reply({ content: `There is no command by that name. Try one of: \`${commandArray.join(', ')}\``, ephemeral: true });

		switch (subType) {
		case 'set': {
			const userOrRoleId = interaction.options.getMentionable('mention').id;
			const userOrRole = interaction.options.getMentionable('mention') instanceof GuildMember ? 'USER' : 'ROLE';
			const value = interaction.options.getBoolean('value');
			const permType = interaction.options.getString('type');
			const guildPerms = await interaction.client.guilds.cache.get(interaction.guild.id)?.commands.fetch(guildCommand.first().permissions.commandId);

			switch (permType) {
			case 'Add': {
				if (guild) {
					await guildPerms.permissions.add({
						permissions: [
							{
								id: userOrRoleId,
								type: userOrRole,
								permission: value,
							},
						],
					});
				}
				else {
					await interaction.guild.commands.permissions.add({
						command: globalCommands.first().permissions.commandId,
						permissions: [
							{
								id: userOrRoleId,
								type: userOrRole,
								permission: value,
							},
						],
					});
				}
				interaction.reply({ content: 'Permissions have been set.', ephemeral: true });
			}
				break;
			case 'Remove': {
				if (guild && userOrRole === 'ROLE') {
					await guildPerms.permissions.remove({
						command: guildCommand.first().permissions.commandId,
						roles: [userOrRoleId],
					});
				}
				else if (guild && userOrRole === 'USER') {
					await guildPerms.permissions.remove({
						command: guildCommand.first().permissions.commandId,
						users: [userOrRoleId],
					});
				}
				else if (userOrRole === 'ROLE') {
					await interaction.guild.commands.permissions.remove({
						command: globalCommands.first().permissions.commandId,
						roles: [userOrRoleId],
					});
				}
				else {
					await interaction.guild.commands.permissions.remove({
						command: globalCommands.first().permissions.commandId,
						users: [userOrRoleId],
					});
				}
				interaction.reply({ content: 'Permissions have been set.', ephemeral: true });
			}
				break;
			}
		}
			break;
		case 'for': {
			const cmd = guildCommand.filter(com => com.name === commandName);
			const globCommands = await interaction.client.application?.commands.fetch();
			const gcmd = globCommands.filter(com => com.name === commandName);

			const displayPerms = (perms) => {
				const permList = [];
				perms.map(p => {
					const suffix = '>';
					let prefix = '<@!';
					if (p.type === 'ROLE') prefix = '<@&';

					permList.push({ name: `Type: ${p.type}`, value: `${prefix}${p.id}${suffix}\nAccess: ${p.permission ? '✅' : '❌'}`, inline: true });
				});

				const permsEmbed = new MessageEmbed()
					.setTitle(`Permissions for the ${commandName} command.`)
					.setTimestamp()
					.setColor('BLURPLE')
					.setDescription('Full list of permissions. If adding extra roles/users, keep in mind that there is a max limit of 10 users/roles per command.')
					.addFields(permList);

				return permsEmbed;
			};

			try {
				if (cmd.size) {
					const perms = await interaction.guild.commands.permissions.fetch({ command: cmd.first().id });
					return interaction.reply({ embeds: [displayPerms(perms)], ephemeral: true });
				}

				const perms = await interaction.guild.commands.permissions.fetch({ command: gcmd.first().id });
				return interaction.reply({ embeds: [displayPerms(perms)], ephemeral: true });

			}
			catch (err) {
				channels.errors.send(err, module);
				interaction.reply({ content: `There was an error. ${commandName} either has no permissions set or another error occured.`, ephemeral: true });
			}


		}
		}

	},
};