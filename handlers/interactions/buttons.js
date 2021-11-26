import { MessageButton, MessageActionRow, MessageSelectMenu } from 'discord.js'

export const buttons = async (interaction, db, data) => {
	const channels = await db.channels
	const userMessageId = interaction.message.content.split(' ')[3]
	const thisButton = data.merchChannel.components.filter(b => {
		return b.messageID === userMessageId
	})
	if (!thisButton.length) return await interaction.reply({ content: 'Unable to find message related with this button.', ephemeral: true })

	try {
		switch (interaction.customId) {
		case thisButton[0].primaryID: {
			const selectID = `select_${thisButton[0].userID}`
			const menu = new MessageActionRow()
				.addComponents(
					new MessageSelectMenu()
						.setCustomId(selectID)
						.setPlaceholder('Nothing selected')
						.addOptions([
							{
								label: 'Yes, this was a password.',
								description: 'Select this option to automatically remove it from our logs.',
								value: 'yes'
							},
							{
								label: 'No, this was not a password.',
								value: 'no'
							}
						])
				)
			const dateTime = new Date(thisButton[0].time).toUTCString()
			const potentialPassowrd = thisButton[0].content
			const serverName = interaction.member.guild.name

			const passwordDM = `${serverName}\n\nHello.\n\nWe saw you typed into the #merch-calls channel on ${dateTime} and the Deep Sea Fishing Admins have flagged this as a potential password which is why you are receiving this DM. That specific channel has all messages logged.\n\nYour message content: ${potentialPassowrd}\n\nIf it is a password, then we recommend that you change it ASAP, even though it got deleted straight away. Please respond with one of the selections to let our Admins know if we should also delete that message from our message logs.\n\nDSF Admin Team.`

			const fetchUser = await interaction.guild.members.fetch(thisButton[0].userID)
			const sentDM = await fetchUser.send({ content: passwordDM, components: [menu] })
			const row = new MessageActionRow()
				.addComponents(new MessageButton(interaction.message.components[0].components[0]).setEmoji('📩').setLabel('DM sent...').setDisabled())
			await interaction.update({ components: [row] })
			console.log(`Action: Password Button\nBy: ${interaction.user.username}\nUser: ${fetchUser.user.username}`)
			await db.collection.updateOne({ _id: interaction.guildId, 'merchChannel.components.messageID': userMessageId }, {
				$set: {
					'merchChannel.components.$.selectID': selectID,
					'merchChannel.components.$.selectMessageID': sentDM.id
				}
			})
		}
			break
		case thisButton[0].dangerID: {
			const content = interaction.message.content.split('\n')
			await interaction.update({ components: [] })
			console.log(`Action: Clear Button\nBy: ${interaction.user.username}\nContent: ${content.slice(3).join(' ')}`)
			await db.collection.updateOne({ _id: interaction.guildId }, {
				$pull: {
					'merchChannel.components': thisButton[0]
				}
			})
		}
		}
	} catch (err) {
		channels.errors.send(err)
	}
}
