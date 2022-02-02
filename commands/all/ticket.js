/* eslint-disable no-inline-comments */
import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed, MessageActionRow, MessageButton } from 'discord.js'
import { aqua } from '../../colors.js'

export default {
	name: 'ticket',
	description: ['Sets up a ticket system using private threads.'],
	aliases: [],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Owner',
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription('Sets up a ticket system using private threads.')
		.setDefaultPermission(false),
	slash: async (interaction) => {
		const ticketButton = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('Open Ticket')
					.setLabel('Open Ticket')
					.setStyle('PRIMARY')
					.setEmoji('✉️')
			)

		const ticketEmbed = new MessageEmbed()
			.setTitle('Open a Ticket!')
			.setDescription('If you have an issue with anyone in this server or friends chat, false calls, or any issue related to our server <#420803482002653190> then please open a ticket.')
			.setColor(aqua)
			.setTimestamp()

		await interaction.reply({ embeds: [ticketEmbed], components: [ticketButton] })
	}
}
