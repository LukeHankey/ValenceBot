import { EmbedBuilder, Collection } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import Color from '../colors.js'
import { randomNum, removeEvents } from '../functions.js'

const monthChoices = [
	{ name: 'January', value: 'January' },
	{ name: 'February', value: 'February' },
	{ name: 'March', value: 'March' },
	{ name: 'April', value: 'April' },
	{ name: 'May', value: 'May' },
	{ name: 'June', value: 'June' },
	{ name: 'July', value: 'July' },
	{ name: 'August', value: 'August' },
	{ name: 'September', value: 'September' },
	{ name: 'October', value: 'October' },
	{ name: 'November', value: 'November' },
	{ name: 'December', value: 'December' }
]

export default {
	name: 'calendar',
	description: [
		'Creates an embed for a calender - defaults to the current month.',
		'Add an event to the current or specified calendar month. Position defaults to the end of the calendar. \nExample:\n ```css\n;calendar add 4 Date: 13th Event: New Event Title! Time: 20:00 - 21:00 Announcement: <link> Host: @everyone```',
		'Edit the current or specified calendar month by field name:\n Date: / Event: / Time: / Announcement: / Host:',
		'Removes 1 or more events from the current or specified calendar month.',
		'Moves one event from x position to y position in the current or specified calendar month.'
	],
	aliases: ['cal'],
	usage: [
		'create <month (optional)>',
		'add <month (optional)> <position (optional)> Date: <Date> Event: <event text> Time: <time> Announcement: <link> Host: <@member(s)/role>',
		'edit <month (optional)> <starting field> <event field> <new value>',
		'remove <month (optional)> <starting field> <delete count>',
		'move <month (optional)> <from position> <to position>'
	],
	guildSpecific: ['472448603642920973', '668330890790699079'],
	permissionLevel: 'Mod',
	data: new SlashCommandBuilder()
		.setName('calendar')
		.setDescription('Various commands to interact with the calendar.')
		.setDefaultPermission(false)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Creates an embed for a calender. Defaults to the current month.')
				.addStringOption((option) =>
					option
						.setName('month')
						.setDescription('Choose a month for the current embed.')
						.addChoices(...monthChoices)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Adds a new event to the calendar.')
				.addStringOption((option) =>
					option.setName('date').setDescription('Set the date of the event.').setRequired(true)
				)
				.addStringOption((option) =>
					option.setName('title').setDescription('Set the title of the event.').setRequired(true)
				)
				.addStringOption((option) =>
					option.setName('time').setDescription('Set the time of the event.').setRequired(true)
				)
				.addStringOption((option) =>
					option.setName('announcement').setDescription('Provide the event announcement link to.').setRequired(true)
				)
				.addUserOption((option) =>
					option.setName('member').setDescription('Set the main host of the event.').setRequired(true)
				)
				.addIntegerOption((option) =>
					option
						.setName('position')
						.setDescription('If included, adds this event to the specified ordered position on the embed.')
				)
				.addStringOption((option) =>
					option
						.setName('month')
						.setDescription('Choose the month of the calendar you want to add to.')
						.addChoices(...monthChoices)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('edit')
				.setDescription('Edit the current or specified calendar month by field name (Date|Event|Time|Announcement|Host).')
				.addIntegerOption((option) =>
					option
						.setName('position')
						.setDescription('The ordered number in the calendar, top down from 1.')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('field')
						.setDescription('The field name in which to edit.')
						.addChoices(
							...[
								{ name: 'Date', value: 'date' },
								{ name: 'Title', value: 'event' },
								{ name: 'Time', value: 'time' },
								{ name: 'Announcement', value: 'announcement' },
								{ name: 'Host', value: 'host' }
							]
						)
						.setRequired(true)
				)
				.addStringOption((option) =>
					option.setName('value').setDescription('Set the new value for the specified field.').setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('month')
						.setDescription('Choose the month of the calendar you want to edit.')
						.addChoices(...monthChoices)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setDescription('Remove an event from a specific calendar.')
				.addIntegerOption((option) =>
					option
						.setName('position')
						.setDescription('The ordered number in the calendar, top down from 1.')
						.setRequired(true)
				)
				.addIntegerOption((option) =>
					option.setName('delete').setDescription('How many to delete. Defaults to 1 (current event).')
				)
				.addStringOption((option) =>
					option
						.setName('month')
						.setDescription('Choose the month of the calendar you want to edit.')
						.addChoices(...monthChoices)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('move')
				.setDescription('Reorder the calendar by moving events.')
				.addIntegerOption((option) =>
					option
						.setName('from')
						.setDescription('The ordered number in the calendar, top down from 1.')
						.setRequired(true)
				)
				.addIntegerOption((option) =>
					option.setName('to').setDescription('The ordered number in the calendar, top down from 1.').setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('month')
						.setDescription('Choose the month of the calendar you want to move an event from.')
						.addChoices(...monthChoices)
				)
				.addStringOption((option) =>
					option
						.setName('month_to')
						.setDescription('Choose the month of the calendar you want to move an event to.')
						.addChoices(...monthChoices)
				)
		),
	slash: async (client, interaction, _) => {
		const months = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		]

		// Variables
		const db = client.database.settings
		const monthIndex = new Date().getUTCMonth()
		const currentYear = new Date().getFullYear()
		const currentMonth = months[monthIndex]
		const channels = await client.database.channels

		const dataFromDb = await db.findOne(
			{ _id: interaction.guild.id },
			{ projection: { events: 1, channels: 1, calendarID: 1 } }
		)
		const calChannelId = dataFromDb.channels.calendar
		const month = interaction.options.getString('month') ?? currentMonth
		const monthFromDb = dataFromDb.calendarID.filter((obj) => {
			return obj.month.toLowerCase() === month.toLowerCase() && obj.year === currentYear
		})

		// Functions
		const createCalendarEmbed = (title) => {
			const embed = new EmbedBuilder()
				.setTitle(title)
				.setDescription('This months events are as follows:')
				.setColor(Color.purpleMedium)
				.setThumbnail(interaction.guild.iconURL())
				.setTimestamp()
				.setFooter({
					text: 'Valence Bot created by luke.h',
					iconURL: client.user.displayAvatarURL()
				})
			return embed
		}

		if (interaction.channelId !== calChannelId) {
			return interaction.reply({
				content: `Try again in the <#${calChannelId}> channel.`,
				ephemeral: true
			})
		}

		switch (interaction.options.getSubcommand()) {
			case 'create':
				{
					// Variables
					const monthOption = interaction.options.getString('month') ?? null

					// Functions
					const createCalendar = async (monthName) => {
						const created = await interaction.channel.send({
							embeds: [createCalendarEmbed(`Calendar for ${monthName}`)]
						})

						await db.findOneAndUpdate(
							{ _id: interaction.guild.id },
							{
								$push: {
									calendarID: {
										$each: [
											{
												messageID: created.id,
												month: monthName,
												year: currentYear,
												events: []
											}
										]
									}
								}
							}
						)
					}

					channels.logs.send(`<@${interaction.user.id}> created a new Calendar embed.`)

					monthOption ? await createCalendar(monthOption) : await createCalendar(currentMonth)
					await interaction.reply({ content: 'Calendar has been created.', ephemeral: true })
				}
				break
			case 'add':
				{
					// Variables
					const date = interaction.options.getString('date')
					const title = interaction.options.getString('title')
					const time = interaction.options.getString('time')
					const announcement = interaction.options.getString('announcement')
					const member = interaction.options.getMember('member')
					// Optionals
					const position = interaction.options.getInteger('position')

					// Function
					const addToCalendar = async (pos) => {
						if (!monthFromDb[0]) {
							return await interaction.reply({
								content: 'Unable to find that calendar.',
								ephemeral: true
							})
						}

						let message = await interaction.channel.messages.fetch(monthFromDb[0].messageID)
						message = message instanceof Collection ? message.first() : message
						const calEmbed = new EmbedBuilder(message.embeds[0].data)

						const eventTag = String(randomNum())

						if (pos) {
							calEmbed.spliceFields(pos - 1, 0, {
								name: date,
								value: `Event: ${title}\nTime: ${time}\n[Announcement](${announcement})\nHost: ${member}`
							})

							await message.edit({ embeds: [calEmbed] })
							await interaction.reply({
								content: 'The calendar has been updated with the new event.',
								ephemeral: true
							})
						} else {
							calEmbed.addFields({
								name: date,
								value: `Event: ${title}\nTime: ${time}\n[Announcement](${announcement})\nHost: ${member}`
							})

							// Edit the embed with the new event
							await message.edit({ embeds: [calEmbed] })
							await interaction.reply({
								content: 'The calendar has been updated with the new event.',
								ephemeral: true
							})
						}

						await db.findOneAndUpdate(
							{ _id: interaction.guild.id, 'calendarID.month': monthFromDb[0].month },
							{
								$push: {
									'calendarID.$.events': {
										messageID: announcement.split('/')[6],
										title,
										eventTag
									}
								}
							}
						)

						await db.updateOne(
							{ _id: interaction.guild.id },
							{
								$push: {
									events: {
										messageID: announcement.split('/')[6],
										title,
										eventTag,
										date: new Date(),
										dateEnd: date,
										month
									}
								}
							}
						)

						return channels.logs.send(
							`Calendar updated - ${interaction.member.displayName} added an event.\n\n/${interaction.commandName} ${interaction.options._subcommand} date: ${date} title: ${title} time: ${time} announcement ${announcement} member: ${member} position: ${position} month ${month}`
						)
					}

					position ? await addToCalendar(position) : await addToCalendar()

					try {
						const eventChannelId = announcement.split('/')[5]
						const eventMessageId = announcement.split('/')[6]

						const eventChannel = client.channels.cache.get(eventChannelId)
						const eventMessage = await eventChannel.messages.fetch(eventMessageId)
						await eventMessage.react('🛑')
					} catch (err) {
						if (err.name === 'TypeError') {
							return await interaction.followUp({
								content: 'Error: Unknown message from Announcement link.',
								ephemeral: true
							})
						}
						channels.errors.send(err)
					}
				}
				break
			case 'edit':
				{
					// Variables
					const position = interaction.options.getInteger('position')
					const field = interaction.options.getString('field')
					const value = interaction.options.getString('value')

					// Functions
					;(async () => {
						if (!monthFromDb[0]) {
							return await interaction.reply({
								content: 'Unable to find that calendar.',
								ephemeral: true
							})
						}

						let message = await interaction.channel.messages.fetch(monthFromDb[0].messageID)
						message = message instanceof Collection ? message.first() : message
						const calEmbed = new EmbedBuilder(message.embeds[0].data)
						const existingFields = calEmbed.data.fields[position - 1]
						const oldValues = existingFields.value.split('\n')

						const eventPostTitle = oldValues[0].slice(7).trim()
						const eventPostMessageId = oldValues[2].split('/')[6].slice(0, -1)
						const eventPostDate = existingFields.name.trim()
						const eventPost = dataFromDb.events.filter(
							(event) =>
								event.messageID === eventPostMessageId &&
								event.title.trim() === eventPostTitle &&
								eventPostDate === event.dateEnd.trim()
						)[0]

						switch (field) {
							case 'date':
								calEmbed.spliceFields(position - 1, 1, {
									name: value,
									value: existingFields.value
								})
								await message.edit({ embeds: [calEmbed] })
								await db.findOneAndUpdate(
									{ _id: message.guild.id, 'events.eventTag': eventPost.eventTag },
									{ $set: { 'events.$.dateEnd': value } }
								)
								break
							case 'announcement':
								{
									const annVal = oldValues[2].split('](')
									calEmbed.spliceFields(position - 1, 1, {
										name: existingFields.name,
										value: existingFields.value.replace(annVal[1], `${value})`)
									})
									await message.edit({ embeds: [calEmbed] })
									await db.findOneAndUpdate(
										{ _id: message.guild.id, 'events.eventTag': eventPost.eventTag },
										{ $set: { 'events.$.messageID': value.split('/')[6] } }
									)
									await db.updateOne(
										{ _id: message.guild.id },
										{
											$set: {
												'calendarID.$[month].events.$[fieldName].messageID': value.split('/')[6]
											}
										},
										{
											arrayFilters: [{ 'month.month': month }, { 'fieldName.messageID': { $ne: value } }]
										}
									)
								}
								break
							default: {
								const [valueToReplace] = oldValues.filter((val) => {
									if (val.toLowerCase().includes(field)) return val
									else return undefined
								})

								const valueName = valueToReplace.split(':')[0]

								calEmbed.spliceFields(position - 1, 1, {
									name: existingFields.name,
									value: existingFields.value.replace(valueToReplace, `${valueName}: ${value}`)
								})
								await message.edit({ embeds: [calEmbed] })
								if (valueName === 'Event') {
									await db.findOneAndUpdate(
										{ _id: message.guild.id, 'events.eventTag': eventPost.eventTag },
										{ $set: { 'events.$.title': value } }
									)
								}
							}
						}

						await interaction.reply({ content: 'The calendar has been edited.', ephemeral: true })
						channels.logs.send(
							`Calendar updated - ${interaction.member.displayName} edited an event.\n\n/${interaction.commandName} ${interaction.options._subcommand} position: ${position} field: ${field} value: ${value} month ${month}`
						)
					})()
				}
				break
			case 'remove':
				{
					const position = interaction.options.getInteger('position')
					const deleteNum = interaction.options.getInteger('delete') ?? 1

					if (!monthFromDb[0]) {
						return await interaction.reply({
							content: 'Unable to find that calendar.',
							ephemeral: true
						})
					}

					let message = await interaction.channel.messages.fetch(monthFromDb[0].messageID)
					message = message instanceof Collection ? message.first() : message
					const calEmbed = new EmbedBuilder(message.embeds[0].data)

					// Logging
					const log = message.embeds[0].fields.splice(position - 1, deleteNum)
					const logValues = log.map((values) => `${values.name}\n${values.value}\n`)
					channels.logs.send(
						`Calendar updated - ${
							interaction?.member.displayName
						} removed event: \`\`\`diff\n- Removed\n${logValues.join('\n')}\`\`\``
					)

					calEmbed.spliceFields(position - 1, deleteNum)
					await message.edit({ embeds: [calEmbed] })

					await interaction.reply({
						content: 'That event has been removed from the calendar.',
						ephemeral: true
					})

					for (const item of logValues) {
						const itemSplit = item.split('\n')
						const eventPostMessageId = itemSplit[3].split('/')[6].slice(0, -1)
						const eventPostTitle = itemSplit[1].slice(7).trim()
						const eventPostDate = itemSplit[0].trim()
						const eventPost = dataFromDb.events.filter(
							(event) =>
								event.messageID === eventPostMessageId &&
								event.title.trim() === eventPostTitle &&
								eventPostDate === event.dateEnd.trim()
						)[0]

						await removeEvents(client, interaction, 'calendar', dataFromDb, eventPost.eventTag)
					}
				}
				break
			case 'move':
				{
					const from = interaction.options.getInteger('from')
					const to = interaction.options.getInteger('to')

					const monthTo = interaction.options.getString('month_to') ?? null
					let monthFromDbTo
					if (monthTo) {
						monthFromDbTo = dataFromDb.calendarID.filter((obj) => {
							return obj.month.toLowerCase() === monthTo.toLowerCase() && obj.year === currentYear
						})
					}

					let message = await interaction.channel.messages.fetch(monthFromDb[0].messageID)
					message = message instanceof Collection ? message.first() : message
					const calEmbed = new EmbedBuilder(message.embeds[0].data)
					const event = calEmbed.data.fields[from - 1]

					if (monthTo !== null) {
						let moveMessage = await interaction.channel.messages.fetch(monthFromDbTo[0].messageID)
						moveMessage = moveMessage instanceof Collection ? moveMessage.first() : moveMessage
						const calEmbedTo = new EmbedBuilder(moveMessage.embeds[0].data)
						if (monthTo === month) {
							calEmbedTo.spliceFields(to - 1, 0, {
								name: event.name,
								value: event.value
							})
							calEmbedTo.spliceFields(from, 1)
						} else {
							calEmbedTo.spliceFields(to - 1, 0, {
								name: event.name,
								value: event.value
							})
							calEmbed.spliceFields(from - 1, 1)
							await message.edit({ embeds: [calEmbed] })
						}

						await moveMessage.edit({ embeds: [calEmbedTo] })

						const item = event.value.split('\n')

						const title = item[0].slice(7).trim()
						const announcement = item[2].slice(15, -1)
						const messageId = announcement.split('/')[6] ?? null
						const eventPostDate = event.name.trim()
						const eventPost = dataFromDb.events.filter(
							(event) =>
								event.messageID === messageId &&
								event.title.trim() === title &&
								eventPostDate === event.dateEnd.trim()
						)[0]

						await db.findOneAndUpdate(
							{ _id: interaction.guild.id, 'calendarID.month': monthFromDb[0].month },
							{ $pull: { 'calendarID.$.events': { eventTag: eventPost.eventTag } } }
						)

						await db.findOneAndUpdate(
							{ _id: interaction.guild.id, 'calendarID.month': monthFromDbTo[0].month },
							{
								$push: {
									'calendarID.$.events': { messageId, title, eventTag: eventPost.eventTag }
								}
							}
						)

						await db.findOneAndUpdate(
							{ _id: interaction.guild.id, eventTag: eventPost.eventTag },
							{ $set: { 'events.$.month': monthFromDbTo[0].month } }
						)
					} else {
						calEmbed.spliceFields(from - 1, 1)
						calEmbed.spliceFields(to - 1, 0, {
							name: event.name,
							value: event.value
						})
						await message.edit({ embeds: [calEmbed] })
					}

					await interaction.reply({ content: 'The event has been moved.', ephemeral: true })
				}
				break
		}
	}
}
