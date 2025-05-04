/* eslint-disable no-inline-comments */
import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import Color from '../colors.js'

export default {
	name: 'ticket',
	description: ['Sets up a ticket system using private threads.'],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription('Sets up a ticket system using private threads or channels.')
		.setDefaultPermission(false)
		.addRoleOption((option) =>
			option.setName('role').setDescription('The role that will be responding to tickets.').setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('prefer')
				.setDescription(
					'Preference of how to handle tickets. Private threads allowed if boost level is at least level 2.'
				)
				.setRequired(true)
				.addChoices(
					...[
						{ name: 'Threads', value: 'Threads' },
						{ name: 'Channels', value: 'Channels' }
					]
				)
		)
		.addStringOption((option) =>
			option
				.setName('description')
				.setDescription('Be specific but concise of what you want users to use the tickets for.')
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option.setName('application').setDescription('Create a form which interfaces with users who create tickets.')
		),
	slash: async (client, interaction, _) => {
		const db = client.database.settings
		const actionRow = new ActionRowBuilder()
		const ticketButton = new ButtonBuilder()
			.setCustomId('Open Ticket')
			.setLabel('Open Ticket')
			.setStyle(ButtonStyle.Primary)
			.setEmoji({ name: '✉️' })

		const applicationButton = new ButtonBuilder()
			.setCustomId('Create Application')
			.setLabel('Create Application')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '📜' })

		const description = interaction.options.getString('description')
		const role = interaction.options.getRole('role')
		const prefer = interaction.options.getString('prefer')
		const application = interaction.options.getBoolean('application')

		const components = application
			? [actionRow.addComponents([applicationButton])]
			: [actionRow.addComponents([ticketButton])]

		const ticketEmbed = new EmbedBuilder()
			.setTitle(application ? 'Submit an Application!' : 'Open a Ticket!')
			.setDescription(description)
			.setColor(Color.aqua)
			.setTimestamp()

		const interactionResponse = await interaction.reply({ embeds: [ticketEmbed], components, withResponse: true })

		await db.updateOne(
			{ _id: interaction.guild.id },
			{
				$addToSet: {
					ticket: {
						$each: [
							{
								role: role.id,
								description,
								prefer,
								ticketStarter: interaction.user.id,
								guildName: interaction.guild.name,
								channelId: interaction.channel.id,
								messageId: interactionResponse.resource?.message.id,
								application
							}
						]
					}
				}
			}
		)
	}
}
