const getDb = require('../../mongodb').getDb;

module.exports = async (client, interaction) => {
	const db = getDb();
	const settings = db.collection('Settings');
	const data = await settings.findOne({ _id: interaction.guildId }, { projection: { merchChannel: { components: 1 } } });
	const { channels: { vis, errors, logs }, visTime } = await settings.findOne({ _id: 'Globals' }, { projection: { channels: { vis: 1, errors: 1, logs: 1 }, visTime: 1 } });

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

				const passwordDM = `Hello.\n\nWe saw you typed into the #merch-calls channel on ${date_time} and the Deep Sea Fishing Admins have flagged this as a potential password which is why you are receiving this DM. That specific channel has all messages logged.\n\nYour message content: ${potential_password}\n\nIf it is a password, then we recommend that you change it ASAP, even though it got deleted straight away. Please respond with one of the selections to let our Admins know if we should also delete that message from our message logs.\n\nDSF Admin Team.`;

				const sentDM = await interaction.member.user.send({ content: passwordDM, components: [menu] });
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
		if (vis === null) {
			await interaction.reply({ content: 'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command for others if you have the current stock.' });
		}
		else {
			await interaction.reply({ content: `**Image uploaded at:** ${visTime}`, files: [vis] });
		}
	}
};