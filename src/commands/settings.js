import { SlashCommandBuilder } from '@discordjs/builders'
import { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js'
import Color from '../colors.js'

/**
 * What each role setting needs to be allowed. A role without these could not
 * do the job the bot would then trust it with.
 */
const ROLE_SETTINGS = {
	'admin-role': {
		field: 'adminRole',
		label: 'Admin Role',
		needs: [PermissionFlagsBits.Administrator],
		needsText: 'Administrator'
	},
	'mod-role': {
		field: 'modRole',
		label: 'Mod Role',
		needs: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers],
		needsText: 'Kick Members and Ban Members'
	}
}

/** Why `role` cannot be the `subcommand` role, or null if it can. */
export const roleProblem = (subcommand, role, guildId) => {
	const { label, needs, needsText } = ROLE_SETTINGS[subcommand]
	if (role.id === guildId) return `@everyone cannot be the ${label}.`
	if (role.managed) return `${role.name} belongs to an integration and cannot be the ${label}.`
	if (!role.permissions.has(needs)) return `The ${label} must have the ${needsText} permission${needs.length > 1 ? 's' : ''}.`
	return null
}

const show = (value, format) => (value ? format(value) : '`Not set`')

export default {
	name: 'settings',
	description: [
		'Shows the current Admin Role, Mod Role and Admin Channel.',
		'Sets the Admin Role. It must have the Administrator permission.',
		'Sets the Mod Role. It must have the Kick Members and Ban Members permissions.',
		'Sets the Admin Channel.'
	],
	usage: ['view', 'admin-role <role>', 'mod-role <role>', 'admin-channel <channel>'],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('View or change the bot settings for this server.')
		.addSubcommand((sub) => sub.setName('view').setDescription('Show the current settings.'))
		.addSubcommand((sub) =>
			sub
				.setName('admin-role')
				.setDescription('Set the role allowed to use admin commands.')
				.addRoleOption((o) => o.setName('role').setDescription('Must have Administrator').setRequired(true))
		)
		.addSubcommand((sub) =>
			sub
				.setName('mod-role')
				.setDescription('Set the role allowed to use mod commands.')
				.addRoleOption((o) => o.setName('role').setDescription('Must have Kick and Ban Members').setRequired(true))
		)
		.addSubcommand((sub) =>
			sub
				.setName('admin-channel')
				.setDescription('Set the channel for admin reports.')
				.addChannelOption((o) =>
					o.setName('channel').setDescription('Text channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
				)
		),
	slash: async (client, interaction, perms) => {
		if (!perms.admin) return interaction.reply({ ...perms.errorA, flags: MessageFlags.Ephemeral })

		const db = client.database.settings
		const channels = await client.database.channels
		const subcommand = interaction.options.getSubcommand()
		const guildId = interaction.guildId

		if (subcommand === 'view') {
			const current = await db.findOne({ _id: guildId }, { projection: { roles: 1, channels: 1 } })
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Settings')
						.setColor(Color.cyan)
						.addFields(
							{ name: 'Admin Role', value: show(current?.roles?.adminRole, (r) => r), inline: true },
							{ name: 'Mod Role', value: show(current?.roles?.modRole, (r) => r), inline: true },
							{
								name: 'Admin Channel',
								value: show(current?.channels?.adminChannel, (c) => `<#${c}>`),
								inline: true
							}
						)
				],
				allowedMentions: { parse: [] },
				flags: MessageFlags.Ephemeral
			})
		}

		let field, label, value, display
		if (subcommand === 'admin-channel') {
			const channel = interaction.options.getChannel('channel')
			;[field, label, value, display] = ['channels.adminChannel', 'Admin Channel', channel.id, `<#${channel.id}>`]
		} else {
			const role = interaction.options.getRole('role')
			const problem = roleProblem(subcommand, role, guildId)
			if (problem) return interaction.reply({ content: `❌ ${problem}`, flags: MessageFlags.Ephemeral })
			const setting = ROLE_SETTINGS[subcommand]
			;[field, label, value, display] = [`roles.${setting.field}`, setting.label, `<@&${role.id}>`, `<@&${role.id}>`]
		}

		const before = await db.findOneAndUpdate({ _id: guildId }, { $set: { [field]: value } }, { returnDocument: 'before' })
		const [group, key] = field.split('.')
		const old = before?.[group]?.[key]
		const oldDisplay = old ? (group === 'channels' ? `<#${old}>` : old) : 'Not set'

		await interaction.reply({
			content: `The ${label} has been set to ${display}.`,
			allowedMentions: { parse: [] },
			flags: MessageFlags.Ephemeral
		})
		return channels.logs.send({
			content: `<@${interaction.user.id}> changed the ${label} in **${interaction.guild.name}** from ${oldDisplay} to ${display}.`,
			allowedMentions: { parse: [] }
		})
	}
}
