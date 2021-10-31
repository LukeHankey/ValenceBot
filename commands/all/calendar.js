import { MessageEmbed } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { purpleMedium } from '../../colors.js'
import { randomNum, removeEvents } from '../../functions.js'

const monthChoices = [
	['January', 'January'],
	['February', 'February'],
	['March', 'March'],
	['April', 'April'],
	['May', 'May'],
	['June', 'June'],
	['July', 'July'],
	['August', 'August'],
	['September', 'September'],
	['October', 'October'],
	['November', 'November'],
	['December', 'December']
]

export default {
	name: 'calendar',
	description: ['Creates an embed for a calender - defaults to the current month.', 'Add an event to the current or specified calendar month. Position defaults to the end of the calendar. \nExample:\n ```css\n;calendar add 4 Date: 13th Event: New Event Title! Time: 20:00 - 21:00 Announcement: <link> Host: @everyone```', 'Edit the current or specified calendar month by field name:\n Date: / Event: / Time: / Announcement: / Host:', 'Removes 1 or more events from the current or specified calendar month.', 'Moves one event from x position to y position in the current or specified calendar month.'],
	aliases: ['cal'],
	usage: ['create <month (optional)>', 'add <month (optional)> <position (optional)> Date: <Date> Event: <event text> Time: <time> Announcement: <link> Host: <@member(s)/role>', 'edit <month (optional)> <starting field> <event field> <new value>', 'remove <month (optional)> <starting field> <delete count>', 'move <month (optional)> <from position> <to position>'],
	guildSpecific: ['472448603642920973', '668330890790699079'],
	permissionLevel: 'Mod',
	data: new SlashCommandBuilder()
		.setName('calendar')
		.setDescription('Various commands to interact with the calendar.')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Creates an embed for a calender. Defaults to the current month.')
				.addStringOption(option =>
					option
						.setName('month')
						.setDescription('Choose a month for the current embed.')
						.addChoices(monthChoices)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Adds a new event to the calendar.')
				.addStringOption(option =>
					option
						.setName('date')
						.setDescription('Set the date of the event.')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('title')
						.setDescription('Set the title of the event.')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('time')
						.setDescription('Set the time of the event.')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('announcement')
						.setDescription('Provide the event announcement link to.')
						.setRequired(true)
				)
				.addUserOption(option =>
					option
						.setName('member')
						.setDescription('Set the main host of the event.')
						.setRequired(true)
				)
				.addIntegerOption(option =>
					option
						.setName('position')
						.setDescription('If included, adds this event to the specified ordered position on the embed.')
				)
				.addStringOption(option =>
					option
						.setName('month')
						.setDescription('Choose the month of the calendar you want to add to.')
						.addChoices(monthChoices)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('edit')
				.setDescription('Edit the current or specified calendar month by field name (Date|Event|Time|Announcement|Host).')
				.addIntegerOption(option =>
					option
						.setName('position')
						.setDescription('The ordered number in the calendar, top down from 1.')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('field')
						.setDescription('The field name in which to edit.')
						.addChoices([
							['Date', 'date'],
							['Title', 'event'],
							['Time', 'time'],
							['Announcement', 'announcement'],
							['Host', 'host']
						])
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('value')
						.setDescription('Set the new value for the specified field.')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('month')
						.setDescription('Choose the month of the calendar you want to edit.')
						.addChoices(monthChoices)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Remove an event from a specific calendar.')
				.addIntegerOption(option =>
					option
						.setName('position')
						.setDescription('The ordered number in the calendar, top down from 1.')
						.setRequired(true)
				)
				.addIntegerOption(option =>
					option
						.setName('delete')
						.setDescription('How many to delete. Defaults to 1 (current event).')
				)
				.addStringOption(option =>
					option
						.setName('month')
						.setDescription('Choose the month of the calendar you want to edit.')
						.addChoices(monthChoices)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('move')
				.setDescription('Reorder the calendar by moving events.')
				.addIntegerOption(option =>
					option
						.setName('from')
						.setDescription('The ordered number in the calendar, top down from 1.')
						.setRequired(true)
				)
				.addIntegerOption(option =>
					option
						.setName('to')
						.setDescription('The ordered number in the calendar, top down from 1.')
						.setRequired(true)

				)
				.addStringOption(option =>
					option
						.setName('month')
						.setDescription('Choose the month of the calendar you want to move an event from.')
						.addChoices(monthChoices)
				)
				.addStringOption(option =>
					option
						.setName('month_to')
						.setDescription('Choose the month of the calendar you want to move an event to.')
						.addChoices(monthChoices)
				)
		),
	slash: async (interaction, _, channels, database) => {
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

		// Variables
		const client = interaction.client
		const monthIndex = (new Date()).getUTCMonth()
		const currentYear = new Date().getFullYear()
		const currentMonth = months[monthIndex]
		const calChannel = interaction.guild.channels.cache.find((ch) => ch.name === 'calendar')

		const dataFromDb = await database.findOne({ _id: interaction.guild.id }, { projection: { events: 1, channels: 1, calendarID: 1 } })

		const month = interaction.options.getString('month') ?? currentMonth
		const monthFromDb = dataFromDb.calendarID.filter(obj => {
			return obj.month.toLowerCase() === month.toLowerCase() && obj.year === currentYear
		})

		// Functions
		const createCalendarEmbed = (title) => {
			const embed = new MessageEmbed()
				.setTitle(title)
				.setDescription('This months events are as follows:')
				.setColor(purpleMedium)
				.setThumbnail(interaction.guild.iconURL())
				.setTimestamp()
				.setFooter('Valence Bot created by Luke_#8346', client.user.displayAvatarURL())
			return embed
		}

		if (interaction.channelId !== calChannel.id) return interaction.reply({ content: `Try again in the <#${calChannel.id}> channel.`, ephemeral: true })

		switch (interaction.options.getSubcommand()) {
		case 'create': {
			// Variables
			const monthOption = interaction.options.getString('month') ?? null

			// Functions
			const createCalendar = async (monthName) => {
				const created = await interaction.channel.send({ embeds: [createCalendarEmbed(`Calendar for ${monthName}`)] })

				await database.findOneAndUpdate({ _id: interaction.guild.id },
					{
						$push: {
							calendarID: {
								$each: [
									{ messageID: created.id, month: monthName, year: currentYear, events: [] }
								]
							}
						}
					})
			}

			channels.logs.send(`<@${interaction.user.id}> created a new Calendar embed.`)

			if (monthOption) {
				await createCalendar(monthOption)
			} else {
				await createCalendar(currentMonth)
			}

			await interaction.reply({ content: 'Calendar has been created.', ephemeral: true })
		}
			break
		case 'add': {
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
				if (!monthFromDb[0]) return await interaction.reply({ content: 'Unable to find that calendar.', ephemeral: true })

				const message = await interaction.channel.messages.fetch(monthFromDb[0].messageID)
				const calEmbed = new MessageEmbed(message.embeds[0])

				// Create the new role and update the database
				const newRole = await interaction.guild.roles.create({
					name: title.concat(` #${randomNum()}`)
				})

				if (pos) {
					calEmbed.spliceFields(pos - 1, 0,
						{ name: date, value: `Event: ${title}\nTime: ${time}\n[Announcement](${announcement})\nHost: ${member}\nRole: ${newRole}` }
					)

					await message.edit({ embeds: [calEmbed] })
					await interaction.reply({ content: 'The calendar has been updated with the new event.', ephemeral: true })
				} else {
					calEmbed.addFields(
						{ name: date, value: `Event: ${title}\nTime: ${time}\n[Announcement](${announcement})\nHost: ${member}\nRole: ${newRole}` }
					)

					// Edit the embed with the new event
					await message.edit({ embeds: [calEmbed] })
					await interaction.reply({ content: 'The calendar has been updated with the new event.', ephemeral: true })
				}

				await database.findOneAndUpdate({ _id: interaction.guild.id, 'calendarID.month': monthFromDb[0].month },
					{
						$push: {
							'calendarID.$.events':
                        { messageID: announcement.split('/')[6], title, eventTag: newRole.name.slice(title.length + 2), roleID: newRole.id }
						}
					})

				await database.updateOne({ _id: interaction.guild.id },
					{
						$push: {
							events:
                        { messageID: announcement.split('/')[6], title, eventTag: newRole.name.slice(title.length + 2), roleID: newRole.id, date: new Date(), dateEnd: date, members: [], month }
						}
					})

				return channels.logs.send(`Calendar updated - ${interaction.member.displayName} added an event.\n\n/${interaction.commandName} ${interaction.options._subcommand} date: ${date} title: ${title} time: ${time} announcement ${announcement} member: ${member} position: ${position} month ${month}`)
			}

			if (position) { await addToCalendar(position) } else { await addToCalendar() }

			try {
				const eventChannelId = announcement.split('/')[5]
				const eventMessageId = announcement.split('/')[6]

				const eventChannel = client.channels.cache.get(eventChannelId)
				const eventMessage = await eventChannel.messages.fetch(eventMessageId)
				await eventMessage.react('📌')
				await eventMessage.react('🛑')
			} catch (err) {
				channels.errors.send(err)
			}
		}
			break
		case 'edit': {
			// Variables
			const position = interaction.options.getInteger('position')
			const field = interaction.options.getString('field')
			const value = interaction.options.getString('value');

			// Functions
			(async () => {
				if (!monthFromDb[0]) return await interaction.reply({ content: 'Unable to find that calendar.', ephemeral: true })

				const message = await interaction.channel.messages.fetch(monthFromDb[0].messageID)
				const calEmbed = new MessageEmbed(message.embeds[0])
				const existingFields = calEmbed.fields[position - 1]
				const oldValues = existingFields.value.split('\n')
				const roleId = oldValues[4].slice(9, 27)

				switch (field) {
				case 'date':
					calEmbed.spliceFields(position - 1, 1, {
						name: value,
						value: existingFields.value
					})
					await message.edit({ embeds: [calEmbed] })
					await database.findOneAndUpdate({ _id: message.guild.id, 'events.roleID': roleId }, { $set: { 'events.$.title': value } })
					await database.updateOne({ _id: message.guild.id }, { $set: { 'calendarID.$[month].events.$[fieldName].title': value } },
						{ arrayFilters: [{ 'month.month': month }, { 'fieldName.title': { $ne: value } }] })
					break

				case 'announcement': {
					const annVal = oldValues[2].split('](')
					calEmbed.spliceFields(position - 1, 1, {
						name: existingFields.name,
						value: existingFields.value.replace(annVal[1], `${value})`)
					})
					await message.edit({ embeds: [calEmbed] })
					await database.findOneAndUpdate({ _id: message.guild.id, 'events.roleID': roleId }, { $set: { 'events.$.messageID': value.split('/')[6] } })
					await database.updateOne({ _id: message.guild.id }, { $set: { 'calendarID.$[month].events.$[fieldName].messageID': value.split('/')[6] } },
						{ arrayFilters: [{ 'month.month': month }, { 'fieldName.messageID': { $ne: value } }] })
				}
					break

				default: {
					const [valueToReplace] = oldValues.filter(val => {
						if (val.toLowerCase().includes(field)) return val
					})

					console.log(valueToReplace)
					const valueName = valueToReplace.split(':')[0]

					calEmbed.spliceFields(position - 1, 1, {
						name: existingFields.name,
						value: existingFields.value.replace(valueToReplace, `${valueName}: ${value}`)
					})
					await message.edit({ embeds: [calEmbed] })
				}
					break
				}

				await interaction.reply({ content: 'The calendar has been edited.', ephemeral: true })
				channels.logs.send(`Calendar updated - ${interaction.member.displayName} edited an event.\n\n/${interaction.commandName} ${interaction.options._subcommand} position: ${position} field: ${field} value: ${value} month ${month}`)
			})()
		}
			break
		case 'remove': {
			const position = interaction.options.getInteger('position')
			const deleteNum = interaction.options.getInteger('delete') ?? 1

			if (!monthFromDb[0]) return await interaction.reply({ content: 'Unable to find that calendar.', ephemeral: true })

			const message = await interaction.channel.messages.fetch(monthFromDb[0].messageID)
			const calEmbed = new MessageEmbed(message.embeds[0])

			// Logging
			const log = message.embeds[0].fields.splice(position - 1, deleteNum)
			const logValues = log.map((values) => `${values.name}\n${values.value}\n`)
			channels.logs.send(`Calendar updated - ${interaction?.member.displayName} removed event: \`\`\`diff\n- Removed\n${logValues.join('\n')}\`\`\``)

			calEmbed.spliceFields(position - 1, deleteNum)
			await message.edit({ embeds: [calEmbed] })

			await interaction.reply({ content: 'That event has been removed from the calendar.', ephemeral: true })

			for (const item of logValues) {
				const items = item.split('\n')
				const title = items[1].slice(7)
				const roleId = items[5].slice(9, 27)
				const role = message.guild.roles.cache.get(roleId) ?? await message.guild.roles.fetch(roleId)
				const eventTag = role.name.slice(title.length + 2)

				await removeEvents(interaction, database, channels, module, dataFromDb, eventTag)
			}
		}
			break
		case 'move': {
			const from = interaction.options.getInteger('from')
			const to = interaction.options.getInteger('to')

			const month_to = interaction.options.getString('month_to') ?? null
			let monthFromDb_to
			if (month_to) {
				monthFromDb_to = dataFromDb.calendarID.filter(obj => {
					return obj.month.toLowerCase() === month_to.toLowerCase() && obj.year === currentYear
				})
			}

			const message = await interaction.channel.messages.fetch(monthFromDb[0].messageID)
			const calEmbed = new MessageEmbed(message.embeds[0])
			const event = calEmbed.fields[from - 1]

			if (month_to !== null) {
				const move_message = await interaction.channel.messages.fetch(monthFromDb_to[0].messageID)
				const calEmbed_to = new MessageEmbed(move_message.embeds[0])
				if (month_to === month) {
					calEmbed_to.spliceFields(to - 1, 0, {
						name: event.name,
						value: event.value
					})
					calEmbed_to.spliceFields(from, 1)
				} else {
					calEmbed_to.spliceFields(to - 1, 0, {
						name: event.name,
						value: event.value
					})
					calEmbed.spliceFields(from - 1, 1)
					await message.edit({ embeds: [calEmbed] })
				}

				await move_message.edit({ embeds: [calEmbed_to] })

				const item = event.value.split('\n')

				const roleId = item[4].slice(9, -1)
				const role = interaction.guild.roles.cache.get(roleId)
				const title = item[0].slice(7)
				const announcement = item[2].slice(15, -1)
				const messageId = announcement.split('/')[6] ?? null
				const eventTag = role.name.slice(title.length + 2)

				console.log(eventTag, item, title, messageId)
				await database.findOneAndUpdate({ _id: interaction.guild.id, 'calendarID.month': monthFromDb[0].month }, { $pull: { 'calendarID.$.events': { eventTag: eventTag } } })

				await database.findOneAndUpdate({ _id: interaction.guild.id, 'calendarID.month': monthFromDb_to[0].month },
					{
						$push: {
							'calendarID.$.events':
                        { messageId, title, eventTag, roleId }
						}
					})

				await database.findOneAndUpdate({ _id: interaction.guild.id, 'events.roleID': roleId }, { $set: { 'events.$.month': monthFromDb_to[0].month } })
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
