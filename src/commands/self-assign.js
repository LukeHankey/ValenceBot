import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js'
import Color from '../colors.js'

const VALENCE = '472448603642920973'
const DSF = '420803245758480405'
/** In DSF, self-assignable roles sit below this one. */
const DSF_CEILING_ROLE = '881696440747958342'
/** In Valence, self-assignable roles sit below this position. */
const VALENCE_CEILING_POSITION = 36

/** A role carrying any of these must never be handed out on request. */
const PRIVILEGED = [
	PermissionFlagsBits.Administrator,
	PermissionFlagsBits.ManageGuild,
	PermissionFlagsBits.ManageRoles,
	PermissionFlagsBits.ManageChannels,
	PermissionFlagsBits.ManageMessages,
	PermissionFlagsBits.KickMembers,
	PermissionFlagsBits.BanMembers,
	PermissionFlagsBits.ModerateMembers
]

/**
 * Whether members may give themselves `role`.
 *
 * The prefix command listed roles by these per-server rules but assigned any
 * role below the bot's own, so in DSF anyone could take roles between the
 * ceiling role and the bot's. Listing and assigning now share this one rule.
 */
export const isSelfAssignable = (role, guild, botRole) => {
	if (role.id === guild.id || role.managed) return false
	if (role.position >= botRole.position) return false
	if (PRIVILEGED.some((p) => role.permissions.has(p))) return false
	if (guild.id === VALENCE) return role.position < VALENCE_CEILING_POSITION
	if (guild.id === DSF) {
		const ceiling = guild.roles.cache.get(DSF_CEILING_ROLE)
		return Boolean(ceiling) && role.position < ceiling.position
	}
	return true
}

export default {
	name: 'self-assign',
	description: ['Gives you a role, or takes it away if you already have it.', 'Shows the roles you can give yourself.'],
	usage: ['role <role>', 'list'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data: new SlashCommandBuilder()
		.setName('self-assign')
		.setDescription('Give yourself a role, or remove it.')
		.addSubcommand((sub) =>
			sub
				.setName('role')
				.setDescription('Add a role to yourself, or remove it if you have it.')
				.addRoleOption((o) => o.setName('role').setDescription('The role').setRequired(true))
		)
		.addSubcommand((sub) => sub.setName('list').setDescription('Show the roles you can give yourself.')),
	slash: async (client, interaction) => {
		const { guild, member } = interaction
		const botRole = guild.members.me.roles.cache.find((r) => r.managed) ?? guild.members.me.roles.highest
		const embed = new EmbedBuilder()
			.setTitle('Self-Assigned Information')
			.setTimestamp()
			.setFooter({ text: `${client.user.username} created by luke.h`, iconURL: guild.iconURL() ?? undefined })

		if (interaction.options.getSubcommand() === 'list') {
			const names = guild.roles.cache
				.filter((r) => isSelfAssignable(r, guild, botRole))
				.map((r) => `\`${r.name}\``)
				.sort()
			if (!names.length) {
				return interaction.reply({
					content: 'There are no roles you can give yourself here.',
					flags: MessageFlags.Ephemeral
				})
			}
			return interaction.reply({
				embeds: [embed.setColor(Color.cyan).setDescription(`Available roles to add:\n${names.join(' | ')}`)],
				flags: MessageFlags.Ephemeral
			})
		}

		const role = interaction.options.getRole('role')
		if (!isSelfAssignable(role, guild, botRole)) {
			return interaction.reply({
				content: `You can't give yourself ${role.name}. Use \`/self-assign list\` to see the roles you can.`,
				flags: MessageFlags.Ephemeral
			})
		}

		const had = member.roles.cache.has(role.id)
		await (had ? member.roles.remove(role.id, 'Self-assign') : member.roles.add(role.id, 'Self-assign'))
		client.logger.info(`Self-assign: ${member.id} ${had ? 'removed' : 'added'} ${role.name} in ${guild.id}`)
		return interaction.reply({
			embeds: [
				embed
					.setColor(had ? Color.redLight : Color.greenLight)
					.addFields({ name: had ? 'Role Removed:' : 'Role Added:', value: `<@&${role.id}>` })
			],
			allowedMentions: { parse: [] },
			flags: MessageFlags.Ephemeral
		})
	}
}
