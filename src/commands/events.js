import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder } from 'discord.js'
import Color from '../colors.js'
import { removeEvents } from '../functions.js'

/**
 * 733164313744769024 - Test Server
 */

export default {
	name: 'events',
	description: ['List the current events.', 'Ends an event and removes the role.'],
	aliases: ['e', 'event'],
	usage: ['', 'end [ID]'],
	guildSpecific: ['472448603642920973', '668330890790699079'],
	permissionLevel: 'Mod',
	data: new SlashCommandBuilder()
		.setName('events')
		.setDescription('Event commands.')
		.setDefaultPermission(false)
		.addSubcommand((subcommand) => subcommand.setName('list').setDescription('List the current events.'))
		.addSubcommand((subcommand) =>
			subcommand
				.setName('end')
				.setDescription('Ends an event.')
				.addStringOption((option) =>
					option.setName('tag').setDescription('The event tag that matches the event.').setRequired(true)
				)
		),
	slash: async (client, interaction, _) => {
		const db = client.database.settings
		const channels = await client.database.channels
		const data = await db.findOne({ _id: interaction.guild.id }, { projection: { events: 1, channels: 1, calendarID: 1 } })
		switch (interaction.options.getSubcommand()) {
			case 'list':
				try {
					// Listing events
					const link = `https://discord.com/channels/${data._id}/${data.channels.events}/`
					const fieldHolder = data.events.map((obj) => {
						const members = obj.members.map((mem) => {
							return `<@!${mem}>`
						})
						return {
							name: obj.title,
							value: `ID: ${obj.eventTag}\nRole: <@&${obj.roleID}>\n[Event posted ${
								obj.date ? 'on ' + obj.date.toString().split(' ').slice(0, 4).join(' ') : ''
							}](${link}${obj.messageID})\nEvent ends on ${obj.dateEnd}\nInterested 📌: ${members.join(', ')}`
						}
					})

					const embed = new EmbedBuilder()
						.setTitle('Event Listing')
						.setColor(Color.cyan)
						.setDescription(
							'These are all of the events currently stored. Some may be old ones, others relatively new and ongoing. Feel free to remove events by their event ID.'
						)
						.addFields(fieldHolder)
					return interaction.reply({ embeds: [embed] })
				} catch (err) {
					channels.errors.send(err)
				}
				break
			case 'end':
				try {
					const tag = interaction.options.getString('tag')
					const checkEventExists = data.events
						.map((event) => {
							if (event.eventTag === tag) {
								return { value: true, message: event.messageID, role: event.roleID }
							} else return undefined
						})
						.filter((valid) => valid)
					if (checkEventExists.length && checkEventExists[0].value) {
						await removeEvents(interaction, db, 'events', data, tag)
						return interaction.reply({ content: 'Event has been removed.', ephemeral: true })
					} else {
						interaction.reply({ content: `There is no event found with ID: \`${tag}\`` })
					}
				} catch (err) {
					channels.errors.send(err)
				}
		}
	},
	run: async (client, message, args, perms) => {
		const db = client.database.settings
		const channels = await client.database.channels
		if (!perms.mod) return message.channel.send(perms.errorM)
		const data = await db.findOne({ _id: message.guild.id }, { projection: { events: 1, channels: 1, calendarID: 1 } })

		switch (args[0]) {
			case 'end':
				try {
					const tag = args[1]
					const checkEventExists = data.events
						.map((event) => {
							if (event.eventTag === tag) {
								return { value: true, message: event.messageID, role: event.roleID }
							} else return undefined
						})
						.filter((valid) => valid)
					if (checkEventExists.length && checkEventExists[0].value) {
						await removeEvents(message, db, 'events', data, tag)
						return message.react('✅')
					} else {
						message.react('❌')
						message.channel.send({ content: `There is no event found with ID: \`${tag}\`` })
					}
				} catch (err) {
					channels.errors.send(err)
				}
				break
			default: {
				try {
					// Listing events
					const link = `https://discord.com/channels/${data._id}/${data.channels.events}/`
					const fieldHolder = data.events.map((obj) => {
						const members = obj.members.map((mem) => {
							return `<@!${mem}>`
						})
						return {
							name: obj.title,
							value: `ID: ${obj.eventTag}\nRole: <@&${obj.roleID}>\n[Event posted ${
								obj.date ? 'on ' + obj.date.toString().split(' ').slice(0, 4).join(' ') : ''
							}](${link}${obj.messageID})\nEvent ends on ${obj.dateEnd}\nInterested 📌: ${members.join(', ')}`
						}
					})

					const embed = new EmbedBuilder()
						.setTitle('Event Listing')
						.setColor(Color.cyan)
						.setDescription(
							'These are all of the events currently stored. Some may be old ones, others relatively new and ongoing. Feel free to remove events by their event ID.'
						)
						.addFields(fieldHolder)
					message.channel.send({ embeds: [embed] })
				} catch (err) {
					channels.errors.send(err)
				}
			}
		}
	}
}
