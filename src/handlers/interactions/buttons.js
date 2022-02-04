import { MongoCollection } from '../../DataBase.js'
import { MessageButton, MessageActionRow, MessageSelectMenu, MessageEmbed } from 'discord.js'
import Color from '../../colors.js'
import Ticket from '../../dsf/ticket.js'

export const buttons = async (interaction, db, data, cache) => {
	const channels = await db.channels
	const scouters = new MongoCollection('ScoutTracker')
	const generalChannel = interaction.guild.channels.cache.find(c => c.name === 'general')
	let [userId, user, content, timestamp] = interaction.message.content.split('\n').slice(3)
	if (user) user = user.split(' ').slice(2).join(' ')
	if (userId) userId = userId.split(' ').slice(3)[0].slice(3, -1)

	try {
		switch (interaction.customId) {
		/**
		 * Password Button
		 * Parse the message content for the User ID, User, Content, Timestamp
		 * customId = `DM ${User}`
		 */
		case `DM ${user}`: {
			const menu = new MessageActionRow()
				.addComponents(
					new MessageSelectMenu()
						.setCustomId(`DM ${user}`)
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

			timestamp = timestamp.split(' ').slice(2).join(' ').slice(0, -3)
			const serverName = interaction.member.guild.name
			const potentialPassowrd = content.split(' ').slice(2).join(' ')
			const passwordDM = `${serverName}\n\nHello.\n\nWe saw you typed into the <#${data.merchChannel.channelID}> channel on ${timestamp} and the Deep Sea Fishing Admins have flagged this as a potential password which is why you are receiving this DM. That specific channel has all messages logged.\n\nYour message content: ${potentialPassowrd}\n\nIf it is a password, then we recommend that you change it ASAP, even though it got deleted straight away. Please respond with one of the selections to let our Admins know if we should also delete that message from our message logs.\n\nDSF Admin Team.`

			const fetchUser = await interaction.guild.members.fetch(userId)
			await fetchUser.send({ content: passwordDM, components: [menu] })

			/**
			 * components[0]: The first ActionRow
			 * components[0].components[0]: The first MessageButton
			 */
			const row = new MessageActionRow()
				.addComponents(new MessageButton(interaction.message.components[0].components[0]).setEmoji('📩').setLabel('DM sent...').setDisabled())
			await interaction.update({ components: [row] })
			console.log(`Action: Password Button\nBy: ${interaction.user.username}\nUser: ${fetchUser.user.username}`)
			cache.set(interaction.message.id, { ...fetchUser.user })
		}
			break
		case 'Clear Buttons':
			await interaction.update({ components: [] })
			break
		case 'Show How To React': {
			const reactMessage = `<@!${userId}> Right Click the Message > Apps > Mark event as dead.\nFor more information, check the pins in <#${data.merchChannel.channelID}>.\n(If you're on mobile, let us know here as apps are currently not available on mobile.).`

			await generalChannel.send({ content: reactMessage })
			await interaction.update({ components: [] })
		}
			break
		case 'Eyes on Merch Calls': {
			const welcomeChannel = interaction.guild.channels.cache.find(c => c.name === 'welcome')
			const rulesChannel = interaction.guild.channels.cache.find(c => c.name === 'rules')
			const nonsenseMessage = `<@!${userId}>, <#${data.merchChannel.channelID}> is for calls only. Please read <#${welcomeChannel.id}> and <#${rulesChannel.id}>.`

			await generalChannel.send({ content: nonsenseMessage })
			await interaction.update({ components: [] })
		}
			break
		case 'Remove Merch Count': {
			if (interaction.user.bot) return
			const item = data.merchChannel.deletions.messages.find(item => item.messageID === interaction.message.id)
			if (item) {
				await scouters.collection.updateOne({ userID: item.authorID }, {
					$inc: {
						count: -1
					}
				})
				await db.collection.updateOne({ _id: interaction.guild.id }, {
					$pull: {
						'merchChannel.deletions.messages': { messageID: item.messageID }
					}
				})
				const newEmbed = new MessageEmbed(interaction.message.embeds[0])
				newEmbed.setColor(Color.greenLight).setTitle('Message Deleted - Count Removed')
				await interaction.message.edit({ embeds: [newEmbed], components: [] })
			}
		}
			break
		case 'Timeout': {
			const member = await interaction.guild.members.fetch(userId)
			const bansChannel = interaction.guild.channels.cache.get('624655664920395786')

			await member.disableCommunicationUntil(Date.now() + (10 * 60 * 1000), `${interaction.member.displayName}: Timeout ${member.displayName} for 10 minutes.`)
			await bansChannel.send({ content: `${member.displayName} has been timed out by ${interaction.member.displayName} for 10 minutes.` })
			await interaction.update({ components: [] })
		}
			break
		case 'Open Ticket': {
			const ticket = new Ticket(interaction, db)
			const created = await ticket.create()
			interaction.reply({ content: `Your ticket has been created at <#${created.id}>`, ephemeral: true })
		}
			break
		case 'Resolve Issue':
			await interaction.reply({ content: `Ticket closed by <@!${interaction.member.id}>.` })
			await interaction.channel.setLocked(true)
			await interaction.channel.setArchived(true)
		}
	} catch (err) {
		channels.errors.send(err)
	}
}
