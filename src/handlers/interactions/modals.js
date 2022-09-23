import { MongoCollection } from '../../DataBase.js'
import { ButtonStyle, EmbedBuilder } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ModalBuilder } from '@discordjs/builders'
import Ticket from '../../ticket.js'
import Color from '../../colors.js'
import { logger } from '../../logging.js'
import ms from 'pretty-ms'

export const modals = async (interaction, db, data) => {
	const channels = await db.channels

	const validateModalApplication = (unparsedData) => {
		try {
			const parsedData = JSON.parse(unparsedData)

			const MAX_COMPONENTS = 5
			if (parsedData.components.length > MAX_COMPONENTS) {
				return interaction.reply({
					content: `Only ${MAX_COMPONENTS} fields are allowed, you provided ${parsedData.components.length}.\n\n\`\`\`json\n${unparsedData}\`\`\``,
					ephemeral: true
				})
			}

			return parsedData
		} catch (err) {
			return interaction.reply({
				content: `It looks like you missed something. \`${err.name}: ${err.message}\``,
				ephemeral: true
			})
		}
	}

	const sendUserInfo = async (id, uData) => {
		const botRole = interaction.guild.members.me.roles.cache.find((r) => r.managed)
		const fetchedMember = await interaction.guild.members.fetch(id)
		const embed = new EmbedBuilder()
			.setTitle(`Member Profile - ${id}`)
			.setDescription('Current tracked stats in this server.')
			.setColor(Color.aqua)
			.setThumbnail(interaction.user.displayAvatarURL())
			.setFooter({
				text: 'Something wrong or missing? Let a Moderator+ know!',
				iconURL: interaction.client.user.displayAvatarURL()
			})
			.setTimestamp()
		const userData = [await uData.collection.findOne({ userID: id })]
		const memberAssignedRoles = fetchedMember.roles.cache
			.filter((r) => r.id !== interaction.guild.id && r.position > botRole.position)
			.sort((a, b) => b.position - a.position)
			.map((role) => `<@&${role.id}>`)
		const memberSelfRoles = fetchedMember.roles.cache
			.filter((r) => r.id !== interaction.guild.id && r.position < botRole.position)
			.map((role) => `<@&${role.id}>`)
		const fields = []

		if (!userData.length) {
			return new EmbedBuilder()
				.setTitle('I found nothing...')
				.setDescription(`${fetchedMember.displayName} does not have a scouting profile.`)
				.setColor(Color.redLight)
				.setTimestamp()
		}

		function _text (text) {
			const code = '```'
			return `${code}fix\n${text}${code}`
		}

		for (const values of userData) {
			fields.push(
				{
					name: `${values.author}`,
					value: `Merch count: ${values.count}\nOther count: ${values.otherCount}\nGame count: ${
						values.game
					}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`,
					inline: true
				},
				{
					name: 'Assigned Roles:',
					value: `${memberAssignedRoles.join(', ') || _text('None')}`,
					inline: true
				},
				{ name: '\u200B', value: '\u200B', inline: true },
				{
					name: 'Self-Assign Roles:',
					value: `${memberSelfRoles.join(', ') || _text('None')}`,
					inline: true
				}
				// Think about if there is anything else to view in the user profile stats
			)
		}
		return embed.addFields(fields)
	}

	try {
		switch (interaction.customId) {
			case 'createApplication':
				{
					logger.info(`${interaction.guild.id} | ${interaction.guild.name} created an application.`)
					const applicationFields = interaction.fields.getTextInputValue('application')
					const parsedData = validateModalApplication(applicationFields)
					const components = parsedData.components.map(
						(c, i) => new ActionRowBuilder({ ...c, type: 4, custom_id: `${c.label}_${i}` })
					)

					const newModal = new ModalBuilder({
						components,
						custom_id: 'startApplication',
						title: parsedData.title
					}).toJSON()

					const startApplication = new ActionRowBuilder().addComponents([
						new ButtonBuilder()
							.setCustomId('Start Application')
							.setLabel('Start Application')
							.setStyle(ButtonStyle.Primary)
							.setEmoji({ name: '📜' })
					])

					await interaction.reply({
						content: 'Your application is all set up! Click the `Start Application` button to view.',
						ephemeral: true
					})

					await interaction.message.edit({ components: [startApplication] })

					await db.collection.findOneAndUpdate(
						{ _id: interaction.guild.id, 'ticket.messageId': interaction.message.id },
						{
							$set: {
								'ticket.$.applicationModal': newModal
							}
						}
					)
				}
				break
			case 'startApplication': {
				await interaction.deferReply({ ephemeral: true })
				logger.info(
					`${interaction.guild.id} | ${interaction.guild.name}: ${interaction.member.displayName} started an application.`
				)
				const ticketData = await db.collection.findOne({ _id: interaction.guild.id }, { projection: { ticket: 1 } })
				const ticket = new Ticket(interaction, ticketData, db)
				const ticketChannel = await ticket.create()

				const currentTicketComponents = ticket.currentTicket.applicationModal.components
				const mappedComponents = currentTicketComponents.map((component) => {
					const inputValue = interaction.fields.getTextInputValue(component.custom_id)
					return new EmbedBuilder()
						.setTitle(component.label)
						.setDescription(inputValue)
						.setTimestamp()
						.setAuthor({
							name: interaction.member.displayName,
							iconURL: interaction.member.avatarURL()
						})
						.setColor(Color.cyan)
				})

				if (interaction.guild.id === '420803245758480405') {
					const scoutTracker = new MongoCollection('ScoutTracker')
					const memberProfile = await sendUserInfo(interaction.member.id, scoutTracker)
					await ticketChannel.send({ embeds: [...mappedComponents, memberProfile] })
				} else {
					await ticketChannel.send({ embeds: [...mappedComponents] })
				}
				await interaction.editReply({
					content: `Your application has been submitted and is now being reviewed by <@&${ticket.roleId}>. Thank you!`,
					ephemeral: true
				})
			}
		}
	} catch (err) {
		await channels.errors.send(err)
	}
}
