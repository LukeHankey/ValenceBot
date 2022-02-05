/* eslint-disable no-inline-comments */
import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed, MessageActionRow, MessageButton } from 'discord.js'
import Color from '../colors.js'

export default {
	name: 'ticket',
	description: ['Sets up a ticket system using private threads.'],
	aliases: [],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription('Sets up a ticket system using private threads or channels.')
		.setDefaultPermission(false)
		.addRoleOption(option =>
			option
				.setName('role')
				.setDescription('The role that will be responding to tickets.')
				.setRequired(true)
		)
		.addStringOption(option =>
			option
				.setName('prefer')
				.setDescription('Preference of how to handle tickets. Private threads allowed if boost level is at least level 2.')
				.setRequired(true)
				.addChoices([
					['Threads', 'Threads'],
					['Channels', 'Channels']
				])
		)
		.addStringOption(option =>
			option
				.setName('description')
				.setDescription('Be specific but concise of what you want users to use the tickets for.')
				.setRequired(true)
		),
	slash: async (interaction, _, db) => {
		const ticketButton = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('Open Ticket')
					.setLabel('Open Ticket')
					.setStyle('PRIMARY')
					.setEmoji('✉️')
			)

		const description = interaction.options.getString('description')
		const role = interaction.options.getRole('role')
		const prefer = interaction.options.getString('prefer')

		await db.collection.updateOne({ _id: interaction.guild.id }, {
			$set: {
				ticket: {
					role: role.id,
					description,
					prefer,
					ticketStarter: interaction.user.id,
					guildName: interaction.guild.name,
					channelId: interaction.channel.id
				}
			}
		})

		const ticketEmbed = new MessageEmbed()
			.setTitle('Open a Ticket!')
			.setDescription(description)
			.setColor(Color.aqua)
			.setTimestamp()

		await interaction.reply({ embeds: [ticketEmbed], components: [ticketButton] })
	}
}
