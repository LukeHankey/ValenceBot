/* eslint-disable no-inline-comments */
import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js'
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
		)
		.addStringOption((option) =>
			option
				.setName('categories')
				.setDescription(
					'Comma-separated list of ticket categories (e.g., "Report,Other"). Leave empty for simple button.'
				)
				.setRequired(false)
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
		const categoriesInput = interaction.options.getString('categories')

		let components
		let ticketCategories = null

		if (application) {
			components = [actionRow.addComponents([applicationButton])]
		} else if (categoriesInput) {
			// Parse categories and create select menu
			ticketCategories = categoriesInput
				.split(',')
				.map((cat) => cat.trim())
				.filter((cat) => cat.length > 0)

			if (ticketCategories.length > 25) {
				return interaction.reply({
					content: 'You can only provide up to 25 categories for the select menu.',
					ephemeral: true
				})
			}

			if (ticketCategories.length === 0) {
				return interaction.reply({
					content: 'Please provide at least one category or leave the categories field empty to use a button.',
					ephemeral: true
				})
			}

			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId('Ticket Category')
				.setPlaceholder('Select a ticket category')
				.addOptions(
					ticketCategories.map((category) => ({
						label: category.length > 100 ? category.substring(0, 97) + '...' : category,
						value: category.length > 100 ? category.substring(0, 100) : category,
						description: `Open a ticket for: ${category.length > 50 ? category.substring(0, 47) + '...' : category}`
					}))
				)

			components = [actionRow.addComponents([selectMenu])]
		} else {
			components = [actionRow.addComponents([ticketButton])]
		}

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
								application,
								categories: ticketCategories
							}
						]
					}
				}
			}
		)
	}
}
