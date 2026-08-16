import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js'

import Color from '../colors.js'
import { buildWindow, describeWindow, CLIENT_FEATURES_DOCUMENT_ID } from '../dsf/calls/mistyWindow.js'

const CONFIRM_TIMEOUT_MS = 60_000

export default {
	name: 'misty',
	// One description per usage entry: help.js pairs them by index.
	description: [
		'Opens the Alt1 Misty tab to everyone signed in, optionally for a set period.',
		'Closes the Misty tab again, leaving it visible to Scouters only.',
		'Shows whether the Misty tab is currently open, and until when.'
	],
	usage: ['open <duration> <reason>', 'close', 'status'],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('misty')
		.setDescription('Control who can see the Alt1 Misty tab.')
		.addSubcommand((sub) =>
			sub
				.setName('open')
				.setDescription('Open the Misty tab to everyone signed in.')
				.addStringOption((option) =>
					option.setName('duration').setDescription('How long to stay open, e.g. 90m, 48h, 3d').setRequired(false)
				)
				.addStringOption((option) =>
					option.setName('reason').setDescription('Shown in the app, e.g. Double XP weekend').setRequired(false)
				)
		)
		.addSubcommand((sub) => sub.setName('close').setDescription('Close the Misty tab again (Scouters only).'))
		.addSubcommand((sub) => sub.setName('status').setDescription('Show whether the Misty tab is currently open.')),
	slash: async (client, interaction, perms) => {
		if (!perms.admin) return interaction.reply(perms.errorA)

		const settings = client.database.settings
		const subcommand = interaction.options.getSubcommand()

		const stored = await settings.findOne({ _id: CLIENT_FEATURES_DOCUMENT_ID })
		const current = stored?.mistyPublic ?? { open: false }

		if (subcommand === 'status') {
			return interaction.reply({
				embeds: [new EmbedBuilder().setTitle('Misty tab').setColor(Color.cream).setDescription(describeWindow(current))]
			})
		}

		let next
		try {
			next = buildWindow({
				close: subcommand === 'close',
				duration: interaction.options.getString('duration'),
				reason: interaction.options.getString('reason'),
				userId: interaction.user.id
			})
		} catch (error) {
			return interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral })
		}

		const embed = new EmbedBuilder()
			.setTitle(subcommand === 'close' ? 'Close the Misty tab?' : 'Open the Misty tab?')
			.setColor(Color.cream)
			.setDescription(`**Now:** ${describeWindow(current)}\n\n**After:** ${describeWindow(next)}`)
			.setFooter({ text: 'Everyone signed in can see world states while it is open. Editing stays Scouter-only.' })

		const confirmId = `misty-confirm-${interaction.id}`
		const buttons = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId(confirmId).setLabel('Confirm').setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId(`misty-cancel-${interaction.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
		)

		const message = await interaction.reply({ embeds: [embed], components: [buttons], withResponse: true })
		const sent = message.resource?.message ?? (await interaction.fetchReply())

		let click
		try {
			click = await sent.awaitMessageComponent({
				filter: (component) => component.user.id === interaction.user.id,
				time: CONFIRM_TIMEOUT_MS
			})
		} catch {
			return interaction.editReply({
				embeds: [embed.setFooter({ text: 'Timed out — nothing changed.' })],
				components: []
			})
		}

		if (click.customId !== confirmId) {
			return click.update({ embeds: [embed.setFooter({ text: 'Cancelled — nothing changed.' })], components: [] })
		}

		// Written whole so the server's change stream sees the complete state.
		await settings.updateOne(
			{ _id: CLIENT_FEATURES_DOCUMENT_ID },
			{ $set: { mistyPublic: next, updatedAt: new Date(), updatedBy: interaction.user.id } },
			{ upsert: true }
		)

		await click.update({
			embeds: [embed.setFooter({ text: `Applied by ${interaction.user.tag}` })],
			components: []
		})
	}
}
