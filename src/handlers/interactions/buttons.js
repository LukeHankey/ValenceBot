import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputStyle,
	ChannelType,
	TextInputBuilder,
	MessageFlags
} from 'discord.js'
import Color from '../../colors.js'
import Ticket from '../../ticket.js'
import camelCase from 'camelcase'
import { logger } from '../../logging.js'
import { getWorldNumber } from '../../dsf/index.js'

class ButtonWarning {
	UNLOGGED_NAMES = ['Clear Buttons', 'Foreign World']

	/**
	 *
	 * @param {string} name
	 */
	constructor(interaction) {
		this.name = interaction.customId
		this.interaction = interaction
		this.buttonName = this._cameliser()
	}

	/**
	 * @private
	 * @returns string
	 */
	_cameliser() {
		return this.name.includes('DM') ? 'password' : camelCase(this.name)
	}

	set scouters(data) {
		this._scouters = data
	}

	get scouters() {
		return this._scouters
	}

	/**
	 * @param {string} userId The Id of the user you want to find.
	 * @returns {object} The profile found by the userId.
	 */
	async profile(userId) {
		if (!this.scouters) {
			throw new Error('Unable to get scouters. You must first specify the database.')
		}
		const profile = await this.scouters.findOne({ userID: userId })
		if (profile === null) {
			const member = await this.interaction.guild.members.fetch(userId)
			const message = this.interaction.message
			const x = await this.scouters.insertOne({
				userID: userId,
				author: member.nickname ?? member.user.username,
				firstTimestamp: message.createdTimestamp,
				firstTimestampReadable: new Date(message.createdTimestamp),
				lastTimestamp: message.createdTimestamp,
				lastTimestampReadable: new Date(message.createdTimestamp),
				count: 0,
				otherCount: 0,
				assigned: []
			})
			return await this.scouters.findOne({ _id: x.insertedId })
		}
		return profile
	}

	/**
	 * @param {string} userId The Id of the user you want to add count to.
	 * @returns {string} The button name.
	 */
	async addCount(userId) {
		if (this.name in this.UNLOGGED_NAMES) {
			return
		}

		const user = await this.profile(userId)
		const button = this._cameliser()
		const buttonName = `buttons.${button}`

		if (!user.buttons) {
			await this.scouters.findOneAndUpdate(
				{ userID: userId },
				{
					$set: {
						[buttonName]: 1
					}
				}
			)
		} else if (user.buttons && !(button in user.buttons)) {
			await this.scouters.findOneAndUpdate(
				{ userID: userId },
				{
					$set: {
						[buttonName]: 1
					}
				}
			)
		} else {
			await this.scouters.findOneAndUpdate(
				{ userID: userId },
				{
					$inc: {
						[buttonName]: 1
					}
				}
			)
		}

		return button
	}

	/**
	 * @param {string} userId The Id of the user you want to add a warning to.
	 * @param {object} warningOptions Options including the button name, content and timestamp.
	 */
	async addWarning(userId, { button, content, timestamp } = {}) {
		if (!timestamp) timestamp = new Date()
		await this.scouters.findOneAndUpdate(
			{ userID: userId },
			{
				$addToSet: {
					warnings: {
						$each: [
							{
								button,
								content,
								timestamp: Date.parse(timestamp)
							}
						]
					}
				}
			}
		)
	}

	/**
	 *
	 * @private
	 * @param {object} data The unprocessed data.
	 * @returns The processed data.
	 */
	_preprocess(data) {
		for (const [k, v] of Object.entries(data)) {
			if (typeof v !== 'string') continue
			if (k === 'content') {
				data[k] = v.split(':')[1].trim()
			} else {
				// eslint-disable-next-line no-unused-vars
				const [_, ...rest] = v.split(': ')
				data[k] = rest.join(':')
			}
		}
		return data
	}

	/**
	 * @param {string} userId The Id of the user to find and make changes to.
	 * @param {object} data The fields if a warning is to be applied.
	 */
	async upload(userId, data = {}) {
		const buttonName = await this.addCount(userId)
		if (data.warning) {
			data = this._preprocess(data)
			data.button = buttonName
			await this.addWarning(userId, data)
		}
	}
}

export const buttons = async (client, interaction, data, cache) => {
	const channels = await client.database.channels
	const db = client.database.settings
	const scouters = client.database.scoutTracker
	const buttonLogger = new ButtonWarning(interaction)
	let generalChannel = interaction.guild.channels.cache.find((c) => c.id === '696375576881004655') // general
	let [userId, user, content, timestamp, channelName] = interaction.message.content.split('\n').slice(3)
	if (channelName) channelName = channelName.slice(0, -3).split(': ')[1]
	if (user) user = user.split(' ').slice(2).join(' ')
	if (userId) userId = userId.split(' ').slice(3)[0].slice(3, -1)
	buttonLogger.scouters = scouters

	// Bot user. This will be overwritten in buttons where userId is required.
	let guildMember = interaction.guild.members.cache.get('668330399033851924')
	if (userId) {
		guildMember = await interaction.guild.members.fetch(userId)
		if (guildMember.roles.cache.hasAny('775940649802793000', '775941183716851764')) {
			generalChannel = interaction.guild.channels.cache.find((c) => c.id === '777598845655842836') // scouters
		}
	}

	const rulesChannel = interaction.guild.channels.cache.find((c) => c.name === 'rules')

	try {
		switch (interaction.customId) {
			/**
			 * Password Button
			 * Parse the message content for the User ID, User, Content, Timestamp
			 * customId = `DM ${User}`
			 */
			case `DM ${user}`:
				{
					const menu = new ActionRowBuilder().addComponents([
						new StringSelectMenuBuilder()
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
					])

					timestamp = timestamp.split(' ').slice(2).join(' ').slice(0, -3)
					const serverName = interaction.member.guild.name
					const potentialPassowrd = content.split(' ').slice(2).join(' ')
					const passwordDM = `${serverName}\n\nHello.\n\nWe saw you typed into the <#${data.merchChannel.channelID}> channel on ${timestamp} and the Deep Sea Fishing Admins have flagged this as a potential password which is why you are receiving this DM. That specific channel has all messages logged.\n\nYour message content: ${potentialPassowrd}\n\nIf it is a password, then we recommend that you change it ASAP, even though it got deleted straight away. Please respond with one of the selections to let our Admins know if we should also delete that message from our message logs.\n\nDSF Admin Team.`

					try {
						await guildMember.send({ content: passwordDM, components: [menu] })
					} catch (err) {
						await interaction.update({ components: [] })
						return await interaction.followUp({ content: 'Unable to send messages to this user.' })
					}

					/**
					 * components[0]: The first ActionRow
					 * components[0].components[0]: The first Button
					 */
					const row = new ActionRowBuilder().addComponents([
						new ButtonBuilder(interaction.message.components[0].components[0].data)
							.setEmoji({ name: '📩' })
							.setLabel('DM sent...')
							.setDisabled()
							.setStyle(ButtonStyle.Primary)
					])
					await interaction.update({ components: [row] })
					logger.verbose(
						`Action: Password Button\nBy: ${interaction.user.username}\nUser: ${guildMember.user.username}`
					)
					cache.set(guildMember.user.id, interaction.message.id)
					await buttonLogger.upload(userId)
				}
				break
			case 'Clear Buttons':
				if (interaction.message.embeds.length) {
					const embed = interaction.message.embeds[0]
					const updatedEmbed = new EmbedBuilder(embed.data).setColor(Color.greenLight)
					return await interaction.update({ components: [], embeds: [updatedEmbed] })
				}
				await interaction.update({ components: [] })
				break
			case 'Show How To React':
				{
					const reactMessage = `<@!${userId}> Right Click / Long Press the Message > Apps > Mark event as dead.\nFor more information, check the pins in <#${data.merchChannel.channelID}>.`

					await generalChannel.send({ content: reactMessage })
					await interaction.update({ components: [] })
					await buttonLogger.upload(userId)
				}
				break
			case 'Eyes on Call Channels':
				{
					const welcomeChannel = interaction.guild.channels.cache.find((c) => c.name === 'welcome')
					const nonsenseMessage = `<@!${userId}>, <#${data.merchChannel.channelID}> and <#${data.merchChannel.otherChannelID}> are for calls only. Please read <#${welcomeChannel.id}> and <#${rulesChannel.id}>.`

					await generalChannel.send({ content: nonsenseMessage })
					await interaction.update({ components: [] })
					await buttonLogger.upload(userId, { content, timestamp, warning: true })

					// Mute Check
					const profile = await buttonLogger.profile(userId)
					const warningCount = profile?.warnings.filter((w) => w.button === buttonLogger.buttonName)
					if (warningCount.length >= 3) {
						const banChannel = interaction.guild.channels.cache.get('624655664920395786')
						const mutedRole = interaction.guild.roles.cache.find((r) => r.name === 'Muted')
						guildMember.roles.add(mutedRole)
						const displayFields = warningCount
							.map((w) => {
								return `${new Date(w.timestamp).toUTCString()}: ${w.content}`
							})
							.reverse()
							.slice(0, 5)
						await banChannel.send({
							content: `${guildMember.toString()} (${userId}) has been Muted.\n\n**Recent Hisory:**\n${displayFields.join(
								'\n'
							)}`
						})
					}
				}
				break
			case 'Remove Merch Count':
				{
					if (interaction.user.bot) return
					const item = data.merchChannel.deletions.messages.find((item) => item.messageID === interaction.message.id)
					if (item) {
						await scouters.updateOne(
							{ userID: item.authorID },
							{
								$inc: {
									count: -1
								}
							}
						)
						await db.updateOne(
							{ _id: interaction.guild.id },
							{
								$pull: {
									'merchChannel.deletions.messages': { messageID: item.messageID }
								}
							}
						)
						const newEmbed = new EmbedBuilder(interaction.message.embeds[0].data)
						newEmbed.setColor(Color.greenLight).setTitle('Message Deleted - Count Removed')
						await interaction.message.edit({ embeds: [newEmbed], components: [] })
					}
				}
				break
			case 'Remove Other Count':
				{
					if (interaction.user.bot) return
					const item = data.merchChannel.deletions.messages.find((item) => item.messageID === interaction.message.id)
					if (item) {
						await scouters.updateOne(
							{ userID: item.authorID },
							{
								$inc: {
									otherCount: -1
								}
							}
						)
						await db.updateOne(
							{ _id: interaction.guild.id },
							{
								$pull: {
									'merchChannel.deletions.messages': { messageID: item.messageID }
								}
							}
						)
						const newEmbed = new EmbedBuilder(interaction.message.embeds[0].data)
						newEmbed.setColor(Color.greenLight).setTitle('Message Deleted - Other Count Removed')
						await interaction.message.edit({ embeds: [newEmbed], components: [] })
					}
				}
				break
			case 'Timeout':
				{
					const bansChannel = interaction.guild.channels.cache.get('624655664920395786')
					await buttonLogger.upload(userId, { content, timestamp, warning: true })

					try {
						const profile = await buttonLogger.profile(userId)
						const warningCount = profile?.warnings.filter((w) => w.button === buttonLogger.buttonName)
						const displayFields = warningCount
							.map((w) => {
								return `${new Date(w.timestamp).toUTCString()}: ${w.content}`
							})
							.reverse()
							.slice(0, 5)
						let minutes = 10
						switch (warningCount.length) {
							case 1:
								minutes = 10
								break
							case 2:
								minutes = 60
								break
							case 3:
								minutes = 1440
								break
							default:
								minutes = 1440
						}
						await guildMember.disableCommunicationUntil(
							Date.now() + minutes * 60 * 1000,
							`${interaction.member.displayName}: Timeout ${guildMember.displayName} for 10 minutes.`
						)
						await bansChannel.send({
							content: `${guildMember.toString()} has been timed out by ${
								interaction.member.displayName
							} for ${minutes} minutes.\n\n**Recent Hisory:**\n${displayFields.join('\n')}`
						})
						await interaction.update({ components: [] })
					} catch (err) {
						if (err.code === 50013) {
							// Missing Permissions
							interaction.reply({
								content: `Unable to timeout ${guildMember.displayName}. Missing Permissions.`
							})
						} else {
							channels.errors.send(err)
							interaction.reply({ content: 'Something went wrong.' })
						}
					}
				}
				break
			case 'Open Ticket':
				{
					const ticketData = await db.findOne({ _id: interaction.guild.id }, { projection: { ticket: 1 } })
					const ticket = new Ticket(interaction, ticketData, db)
					const created = await ticket.create()
					if (!ticket.memberIncluded) {
						interaction.reply({
							content: `Your ticket has been created at <#${created.id}>`,
							flags: MessageFlags.Ephemeral
						})
					} else {
						interaction.reply({
							content: `Your ticket has been created. Please wait while the <@&${ticket.roleId}> review.`,
							flags: MessageFlags.Ephemeral
						})
					}
					if (interaction.guild.id === '420803245758480405') {
						await buttonLogger.upload(interaction.member.id)
					}
				}
				break
			case 'Close Ticket':
				{
					const buttonDisabled = new ActionRowBuilder().addComponents([
						new ButtonBuilder(interaction.message.components[0].components[0].data)
							.setEmoji({ name: '✅' })
							.setLabel('Issue resolved')
							.setDisabled(true)
					])
					const interactionResponse = await interaction.update({ components: [buttonDisabled], withResponse: true })
					await interaction.followUp({ content: `Ticket closed by <@!${interaction.member.id}>.` })
					if (interaction.channel.type === ChannelType.PrivateThread) {
						await interaction.channel.setLocked(true)
						await interaction.channel.setArchived(true)
					} else {
						const roleId = interactionResponse.resource?.message.content.split(' ')[1].slice(3, 21)

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
			case 'Create Application':
				{
					const ticketData = await db.findOne({ _id: interaction.guild.id }, { projection: { ticket: 1 } })
					const ticket = new Ticket(interaction, ticketData, db)
					if (interaction.member.id !== ticket.currentTicket.ticketStarter) {
						return interaction.reply({ content: 'You cannot use this button.', flags: MessageFlags.Ephemeral })
					}
					const applicationModal = new ModalBuilder().setCustomId('createApplication').setTitle('Create Application')

					const instructions = new TextInputBuilder()
						.setCustomId('instructions')
						.setLabel('Instructions')
						.setStyle(TextInputStyle.Paragraph)
						.setValue(
							'-- Anything you write in this box will be ignored! --\n\nModals can have up to 5 fields, either a single line (short) or a paragraph box like this one. In the next box, please remove as appropriate and fill in the values.\n\ntitle=Modal title\nlabel=Title of current field (45 char max)\nstyle=1/2 (short/paragraph)\nrequired=true/false\n\nTitle, label and style are required.'
						)

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

					const firstActionRow = new ActionRowBuilder().addComponents([instructions])
					const secondActionRow = new ActionRowBuilder().addComponents([exampleApplication])

					applicationModal.addComponents([firstActionRow, secondActionRow])
					await interaction.showModal(applicationModal)
				}
				break
			case 'Start Application':
				{
					const ticketData = await db.findOne({ _id: interaction.guild.id }, { projection: { ticket: 1 } })
					const ticket = new Ticket(interaction, ticketData, db)

					const applicationData = ticket.currentTicket.applicationModal
					const applicationModal = new ModalBuilder()
						.setCustomId(applicationData.custom_id)
						.setTitle(applicationData.title)

					const actionRows = applicationData.components.map((c) => {
						return new ActionRowBuilder().addComponents([new TextInputBuilder(c)])
					})

					applicationModal.addComponents(actionRows)
					await interaction.showModal(applicationModal)
				}
				break
			case 'Read The Pins':
				await generalChannel.send({
					content: `<@!${userId}>, invalid call format. Read the pins in <#${data.merchChannel.channelID}> and <#${data.merchChannel.otherChannelID}> for acceptable formats!`
				})
				await interaction.update({ components: [] })
				await buttonLogger.upload(userId)
				break
			case 'Foreign World':
				await generalChannel.send({
					content: `<@!${userId}>, we don't call foreign server worlds. Please see <#${rulesChannel.id}> 11.`
				})
				await interaction.update({ components: [] })
				await buttonLogger.upload(userId)
				break
			case 'Call Already Posted':
				await generalChannel.send({
					content: `<@${userId}>, thanks for the call but world \`${getWorldNumber(
						content
					)}\` has already been posted! <#${
						channelName === 'other-dsf-calls' ? data.merchChannel.otherChannelID : data.merchChannel.channelID
					}>`
				})
				await interaction.update({ components: [] })
				break
		}
	} catch (err) {
		channels.errors.send(err)
	}
}
