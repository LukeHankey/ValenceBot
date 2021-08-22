const getDb = require('../../mongodb').getDb;
const { MessageEmbed, MessageButton, MessageActionRow, MessageSelectMenu } = require('discord.js');
const { Permissions } = require('../../classes.js');
const { red_dark } = require('../../colors.json');

module.exports = async (client, interaction) => {
	const db = getDb();
	const settings = db.collection('Settings');
	const data = await settings.findOne({ _id: interaction.guildId }, { projection: { merchChannel: { components: 1 } } });
	const { channels: { errors, logs } } = await settings.findOne({ _id: 'Globals' }, { projection: { channels: { errors: 1, logs: 1 } } });

	const channels = {
		errors: {
			id: errors,
			embed: function(err, module) {
				const fileName = module.id.split('\\').pop();
				const embed = new MessageEmbed()
					.setTitle(`An error occured in ${fileName}`)
					.setColor(red_dark)
					.addField(`${err.message}`, `\`\`\`${err.stack}\`\`\``);
				return embed;
			},
			send: function(...args) {
				const channel = client.channels.cache.get(this.id);
				return channel.send({ embeds: [ this.embed(...args) ] });
			},
		},
		logs: {
			id: logs,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send({ content });
			},
		},
	};

	if (interaction.isButton()) {
		const userMessageId = interaction.message.content.split(' ')[3];
		const thisButton = data.merchChannel.components.filter(b => {
			return b.messageID === userMessageId;
		});
		if (!thisButton.length) return await interaction.reply({ content: 'Unable to find message related with this button.', ephemeral: true });

		try {
			switch (interaction.customId) {
			case thisButton[0].primaryID: {
				const selectID = `select_${thisButton[0].userID}`;
				const menu = new MessageActionRow()
					.addComponents(
						new MessageSelectMenu()
							.setCustomId(selectID)
							.setPlaceholder('Nothing selected')
							.addOptions([
								{
									label: 'Yes, this was a password.',
									description: 'Select this option to automatically remove it from our logs.',
									value: 'yes',
								},
								{
									label: 'No, this was not a password.',
									value: 'no',
								},
							]),
					);
				const date_time = new Date(thisButton[0].time).toUTCString();
				const potential_password = thisButton[0].content;
				const server_name = interaction.member.guild.name;

				const passwordDM = `${server_name}\n\nHello.\n\nWe saw you typed into the #merch-calls channel on ${date_time} and the Deep Sea Fishing Admins have flagged this as a potential password which is why you are receiving this DM. That specific channel has all messages logged.\n\nYour message content: ${potential_password}\n\nIf it is a password, then we recommend that you change it ASAP, even though it got deleted straight away. Please respond with one of the selections to let our Admins know if we should also delete that message from our message logs.\n\nDSF Admin Team.`;

				const fetchUser = await interaction.guild.members.fetch(thisButton[0].userID);
				const sentDM = await fetchUser.send({ content: passwordDM, components: [menu] });
				const row = new MessageActionRow()
					.addComponents(new MessageButton(interaction.message.components[0].components[0]).setEmoji('📩').setLabel('DM sent...').setDisabled());
				await interaction.update({ components: [row] });
				await settings.updateOne({ _id: interaction.guildId, 'merchChannel.components.messageID': userMessageId }, {
					$set: {
						'merchChannel.components.$.selectID': selectID,
						'merchChannel.components.$.selectMessageID': sentDM.id,
					},
				});
			}
				break;
			case thisButton[0].dangerID: {
				await interaction.update({ components: [] });
				await settings.updateOne({ _id: interaction.guildId }, {
					$pull: {
						'merchChannel.components': thisButton[0],
					},
				});
			}
			}
		}
		catch (err) {
			channels.errors.send(err, module);
		}
	}
	else if (interaction.isCommand()) {
		const commandDB = await settings.findOne({ _id: interaction.channel.guild.id }, { projection: { prefix: 1, roles: 1 } });
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		const aR = new Permissions('adminRole', commandDB, interaction);
		const mR = new Permissions('modRole', commandDB, interaction);
		const owner = new Permissions('owner', commandDB, interaction);

		const perms = {
			owner: owner.botOwner(),
			admin: interaction.member.roles.cache.has(aR.memberRole()[0]) || interaction.member.roles.cache.has(aR.roleID) || interaction.member.id === interaction.channel.guild.ownerId,
			mod: interaction.member.roles.cache.has(mR.memberRole()[0]) || interaction.member.roles.cache.has(mR.roleID) || mR.modPlusRoles() >= mR._role.rawPosition || interaction.member.id === interaction.channel.guild.ownerId,
			errorO: owner.ownerError(),
			errorM: mR.error(),
			errorA: aR.error(),
		};

		/**
		 * Must fetch the commands first so they are in the cache
		 * This allows to get the ApplicationComamnd to edit/delete
		 * Can set permissions here
		 */

		// Test Server
		// const commandI = await client.guilds.cache.get('668330890790699079')?.commands.fetch();
		// console.log(commandI, interaction.commandId);
		// const guildInteractionPerms = await interaction.guild.commands.permissions.fetch({ guild: interaction.guild.id });
		// View all permissions
		// console.log(guildInteractionPerms);

		// await interaction.command.edit({ defaultPermission: false });
		// await interaction.command.permissions.set({ permissions:
		// [{
		// 	id: '668519504233627679',
		// 	type: 'ROLE',
		// 	permission: true,
		// },
		// {
		// 	id: '212668377586597888',
		// 	type: 'USER',
		// 	permission: true,
		// }],
		// });
		// const comF = commandI.filter(app => app.name === interaction.commandName).first();
		// Currently no builder to apply defaultPermission, so have to edit manually where false means nobody can use the command.
		// await comF.edit({ defaultPermission: true });
		// Resets permissions on bot restart. Have to reuse a command for them to take effect.
		// await comF.permissions.set({ permissions: [{
		// 	id: '668519504233627679',
		// 	type: 'ROLE',
		// 	permission: true,
		// }],
		// });

		try {
			await command.slash(interaction, perms, channels);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
	else if (interaction.isSelectMenu()) {
		const serverName = interaction.message.content.split('\n')[0];
		const dmData = await settings.findOne({ serverName }, { projection: { merchChannel: { components: 1, deletions: 1 } } });
		const thisSelection = dmData.merchChannel.components.filter(b => {
			return b.selectMessageID === interaction.message.id;
		});
		if (interaction.customId === thisSelection[0].selectID) {
			try {
				await interaction.update({ components: [] });
				const errorChannel = client.channels.cache.get(dmData.merchChannel.deletions.channelID);
				const buttonMessage = await errorChannel.messages.fetch(thisSelection[0].buttonMessageID);
				if (interaction.values.includes('yes')) {
					await interaction.followUp({ content: 'Thank you for responding, the log has been automatically removed.' });
					await buttonMessage.delete();
					errorChannel.send({ content: `A password was confirmed by <@!${thisSelection[0].userID}> and the message has been deleted.` });
					await settings.updateOne({ serverName: 'Deep Sea Fishing' }, {
						$pull: {
							'merchChannel.components': thisSelection[0],
						},
					});
				}
				else {
					interaction.followUp({ content: 'Thank you for responding.' });
					buttonMessage.edit({ components: [] });
					await settings.updateOne({ serverName: 'Deep Sea Fishing' }, {
						$pull: {
							'merchChannel.components': thisSelection[0],
						},
					});
				}
			}
			catch(err) {
				channels.errors.send(err, module);
			}
		}

	}
	else { return; }

};