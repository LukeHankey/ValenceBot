import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder, MessageFlags } from 'discord.js'
import Color from '../colors.js'
import { BLOCKED_FIELD, blockedRoles } from './self-assign.js'

/** A slash option holds one role, so a list is several optional options. */
const ROLE_OPTIONS = ['role', 'role2', 'role3', 'role4', 'role5']

const withRoles = (sub, verb) => {
	for (const [i, name] of ROLE_OPTIONS.entries()) {
		sub.addRoleOption((o) =>
			o
				.setName(name)
				.setDescription(i === 0 ? `Role to ${verb}` : `Another role to ${verb}`)
				.setRequired(i === 0)
		)
	}
	return sub
}

/** The distinct roles given across the role options. */
export const chosenRoles = (options) => [
	...new Map(
		ROLE_OPTIONS.map((name) => options.getRole(name))
			.filter(Boolean)
			.map((r) => [r.id, r])
	).values()
]

const mentions = (ids) => ids.map((id) => `<@&${id}>`).join(', ')

export default {
	name: 'self-assign-block',
	description: [
		'Stops up to five roles from being self-assignable.',
		'Makes up to five blocked roles self-assignable again.',
		'Shows the roles blocked from self-assign.'
	],
	usage: ['add <role> [role2..role5]', 'remove <role> [role2..role5]', 'list'],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('self-assign-block')
		.setDescription('Choose roles members cannot give themselves with /self-assign.')
		.addSubcommand((sub) => withRoles(sub.setName('add').setDescription('Block roles from self-assign.'), 'block'))
		.addSubcommand((sub) => withRoles(sub.setName('remove').setDescription('Unblock roles.'), 'unblock'))
		.addSubcommand((sub) => sub.setName('list').setDescription('Show the blocked roles.')),
	slash: async (client, interaction, perms) => {
		if (!perms.admin) return interaction.reply({ ...perms.errorA, flags: MessageFlags.Ephemeral })

		const settings = client.database.settings
		const guildId = interaction.guildId
		const subcommand = interaction.options.getSubcommand()

		if (subcommand === 'list') {
			const blocked = await blockedRoles(settings, guildId)
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Blocked from self-assign')
						.setColor(Color.cyan)
						.setDescription(blocked.length ? mentions(blocked) : 'No roles are blocked.')
				],
				allowedMentions: { parse: [] },
				flags: MessageFlags.Ephemeral
			})
		}

		const ids = chosenRoles(interaction.options).map((r) => r.id)
		const update =
			subcommand === 'add'
				? { $addToSet: { [BLOCKED_FIELD]: { $each: ids } } }
				: { $pull: { [BLOCKED_FIELD]: { $in: ids } } }
		await settings.updateOne({ _id: guildId }, update)

		const verb = subcommand === 'add' ? 'blocked' : 'unblocked'
		await interaction.reply({
			content: `${mentions(ids)} ${ids.length === 1 ? 'is' : 'are'} now ${verb} for self-assign.`,
			allowedMentions: { parse: [] },
			flags: MessageFlags.Ephemeral
		})
		const channels = await client.database.channels
		return channels.logs.send({
			content: `<@${interaction.user.id}> ${verb} ${mentions(ids)} for self-assign in **${interaction.guild.name}**.`,
			allowedMentions: { parse: [] }
		})
	}
}
