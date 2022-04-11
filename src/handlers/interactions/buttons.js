import { MongoCollection } from '../../DataBase.js'
import { ActionRowBuilder, SelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputStyle, ChannelType } from 'discord.js'
import Color from '../../colors.js'
import Ticket from '../../ticket.js'
import { TextInputBuilder, UnsafeTextInputBuilder, UnsafeButtonBuilder } from '@discordjs/builders'

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
			const menu = new ActionRowBuilder()
				.addComponents(
					new SelectMenuBuilder()
						.setCustomId(`DM ${user}`)
						.setPlaceholder('Nothing selected')
						.addOptions(
							{
								label: 'Yes, this was a password.',
								description: 'Select this option to automatically remove it from our logs.',
								value: 'yes'
							},
							{
								label: 'No, this was not a password.',
								value: 'no'
							}
						)
				)

			timestamp = timestamp.split(' ').slice(2).join(' ').slice(0, -3)
			const serverName = interaction.member.guild.name
			const potentialPassowrd = content.split(' ').slice(2).join(' ')
			const passwordDM = `${serverName}\n\nHello.\n\nWe saw you typed into the <#${data.merchChannel.channelID}> channel on ${timestamp} and the Deep Sea Fishing Admins have flagged this as a potential password which is why you are receiving this DM. That specific channel has all messages logged.\n\nYour message content: ${potentialPassowrd}\n\nIf it is a password, then we recommend that you change it ASAP, even though it got deleted straight away. Please respond with one of the selections to let our Admins know if we should also delete that message from our message logs.\n\nDSF Admin Team.`

			const fetchUser = await interaction.guild.members.fetch(userId)
			await fetchUser.send({ content: passwordDM, components: [menu] })

			/**
			 * components[0]: The first ActionRow
			 * components[0].components[0]: The first Button
			 */
			const row = new ActionRowBuilder()
				.addComponents(new UnsafeButtonBuilder(interaction.message.components[0].components[0].data).setEmoji({ name: '📩' }).setLabel('DM sent...').setDisabled().setStyle(ButtonStyle.Primary))
			await interaction.update({ components: [row] })
			console.log(`Action: Password Button\nBy: ${interaction.user.username}\nUser: ${fetchUser.user.username}`)
			cache.set(interaction.message.id, { ...fetchUser.user })
		}
			break
		case 'Clear Buttons':
			if (interaction.message.embeds.length) {
				const embed = interaction.message.embeds[0]
				const updatedEmbed = new EmbedBuilder(embed)
					.setColor(Color.greenLight)
				return await interaction.update({ components: [], embeds: [updatedEmbed] })
			}
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
				const newEmbed = new EmbedBuilder(interaction.message.embeds[0])
				newEmbed.setColor(Color.greenLight).setTitle('Message Deleted - Count Removed')
				await interaction.message.edit({ embeds: [newEmbed], components: [] })
			}
		}
			break
		case 'Timeout': {
			const member = await interaction.guild.members.fetch(userId)
			const bansChannel = interaction.guild.channels.cache.get('624655664920395786')

			try {
				await member.disableCommunicationUntil(Date.now() + (10 * 60 * 1000), `${interaction.member.displayName}: Timeout ${member.displayName} for 10 minutes.`)
				await bansChannel.send({ content: `${member.displayName} has been timed out by ${interaction.member.displayName} for 10 minutes.` })
				await interaction.update({ components: [] })
			} catch (err) {
				if (err.code === 50013) {
					// Missing Permissions
					interaction.reply({ content: `Unable to timeout ${member.displayName}. Missing Permissions.` })
				} else {
					channels.errors.send(err)
					interaction.reply({ content: 'Something went wrong.' })
				}
			}
		}
			break
		case 'Open Ticket': {
			const ticketData = await db.collection.findOne({ _id: interaction.guild.id }, { projection: { ticket: 1 } })
			const ticket = new Ticket(interaction, ticketData, db)
			const created = await ticket.create()
			if (!ticket.memberIncluded) {
				interaction.reply({ content: `Your ticket has been created at <#${created.id}>`, ephemeral: true })
			} else {
				interaction.reply({ content: `Your ticket has been created. Please wait while the <@&${ticket.roleId}> review.`, ephemeral: true })
			}
		}
			break
		case 'Resolve Issue': {
			const buttonDisabled = new ActionRowBuilder().addComponents(new ButtonBuilder(interaction.message.components[0].components[0].data).setEmoji({ name: '✅' }).setLabel('Issue resolved').setDisabled(true))
			await interaction.update({ components: [buttonDisabled], fetchReply: true })
			await interaction.followUp({ content: `Ticket closed by <@!${interaction.member.id}>.` })
			if (interaction.channel.type === ChannelType.GuildPrivateThread) {
				await interaction.channel.setLocked(true)
				await interaction.channel.setArchived(true)
			} else {
				const roleId = interaction.message.content.split(' ')[1].slice(3, 21)

				await interaction.channel.permissionOverwrites.set([
					{
						id: roleId,
						allow: 'ViewChannel',
						type: 'role'
					},
					{
						id: interaction.guild.id,
						deny: 'ViewChannel',
						type: 'role'
					}
				])
			}
		}
			break
		case 'Unban': {
			const banEmbed = interaction.message.embeds[0]
			const userId = banEmbed.fields.filter(field => field.name === 'User ID')[0].value
			const banStatus = banEmbed.fields.filter(field => field.name === 'Status')[0]
			const updatedBanEmbed = new EmbedBuilder(banEmbed)
				.setColor(Color.greenLight)
				.spliceFields(banEmbed.fields.indexOf(banStatus), 1, Object.assign(banStatus, { value: 'Unbanned' }))
			try {
				await interaction.guild.bans.remove(userId)
			} catch (err) {
				const updateErrorBanEmbed = new EmbedBuilder(banEmbed)
					.setColor(Color.greenLight)
					.spliceFields(banEmbed.fields.indexOf(banStatus), 1, Object.assign(banStatus, { value: err.message }))
				interaction.reply({ content: `Unable to unban user: \`${err.message}\`.`, ephemeral: true })
				return await interaction.message.edit({ components: [], embeds: [updateErrorBanEmbed] })
			}

			await interaction.update({ components: [], embeds: [updatedBanEmbed] })
		}
			break
		case 'Create Application': {
			const ticketData = await db.collection.findOne({ _id: interaction.guild.id }, { projection: { ticket: 1 } })
			const ticket = new Ticket(interaction, ticketData, db)
			if (interaction.member.id !== ticket.currentTicket.ticketStarter) {
				return interaction.reply({ content: 'You cannot use this button.', ephemeral: true })
			}
			const applicationModal = new ModalBuilder()
				.setCustomId('createApplication')
				.setTitle('Create Application')

			const instructions = new TextInputBuilder()
				.setCustomId('instructions')
				.setLabel('Instructions')
				.setStyle(TextInputStyle.Paragraph)
				.setValue('-- Anything you write in this box will be ignored! --\n\nModals can have up to 5 fields, either a single line (short) or a paragraph box like this one. In the next box, please remove as appropriate and fill in the values.\n\ntitle=Modal title\nlabel=Title of current field (45 char max)\nstyle=1/2 (short/paragraph)\nrequired=true/false\n\nTitle, label and style are required.')

			const modalExample = {
				title: 'My Cool Modal',
				components: [
					{
						label: 'What is your name?',
						style: 1,
						min_length: 2,
						max_length: 100,
						value: 'Bot',
						required: true
					},
					{
						label: 'Tell me a story',
						style: 2,
						min_length: 1,
						max_length: 4000,
						placeholder: '',
						required: false
					}
				]
			}

			const exampleApplication = new TextInputBuilder()
				.setCustomId('application')
				.setLabel('Application')
				.setStyle(TextInputStyle.Paragraph)
				.setValue(JSON.stringify(modalExample, null, 4))

			const firstActionRow = new ActionRowBuilder().addComponents(instructions)
			const secondActionRow = new ActionRowBuilder().addComponents(exampleApplication)

			applicationModal.addComponents(firstActionRow, secondActionRow)
			await interaction.showModal(applicationModal)
		}
			break
		case 'Start Application': {
			const ticketData = await db.collection.findOne({ _id: interaction.guild.id }, { projection: { ticket: 1 } })
			const ticket = new Ticket(interaction, ticketData, db)

			const applicationData = ticket.currentTicket.applicationModal
			const applicationModal = new ModalBuilder()
				.setCustomId(applicationData.custom_id)
				.setTitle(applicationData.title)

			const actionRows = applicationData.components.map(c => {
				return new ActionRowBuilder()
					.addComponents(
						new UnsafeTextInputBuilder(c)
					)
			})

			applicationModal.addComponents(...actionRows)
			await interaction.showModal(applicationModal)
		}
			break
		case 'Too Slow!':
			await interaction.reply({ content: 'What a noob! KEKW' })
			break
		case 'Read The Pins':
			await generalChannel.send({ content: `<@!${userId}>, invalid call format. Read the pins!` })
		}
	} catch (err) {
		channels.errors.send(err)
	}
}
