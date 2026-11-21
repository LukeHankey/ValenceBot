import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder, MessageFlags } from 'discord.js'
import Color from '../colors.js'
import ms from 'pretty-ms'
import { paginate, paginateFollowUP, capitalise } from '../functions.js'

const ONE_MONTH_MS = 2.628e9
const LEADERBOARD_MIN_COUNT = 15
const LEADERBOARD_MAX = 100

/** One embed field per profile, for the leaderboard pages. */
export const leaderboardFields = (profiles, { lastActive = false } = {}) =>
	profiles.slice(0, LEADERBOARD_MAX).map((p) => ({
		name: `${p.author}`,
		value: `Merch count: ${p.count}\nOther count: ${p.otherCount}\n${
			lastActive
				? `Last Active: ${p.lastTimestampReadable.toString().split(' ').slice(1, 5).join(' ')}`
				: `Active for: ${ms(p.lastTimestamp - p.firstTimestamp)}`
		}`,
		inline: true
	}))

const footer = (client, page, total) => ({
	text: `Page ${page + 1} of ${total} - Something wrong or missing? Let a Moderator+ know!`,
	iconURL: client.user.displayAvatarURL()
})

const codeText = (text) => `\`\`\`fix\n${text}\`\`\``

export default {
	name: 'profile',
	// One description per usage entry: help.js pairs them by index.
	description: [
		'Displays your profile, or the specified member’s profile (Moderator+).',
		'Displays the profiles of everyone with a role (Moderator+).',
		'Creates your profile.',
		'Shows the top scouters by merch count.',
		'Shows active profiles, optionally only Scouters or Verified Scouters (Moderator+).',
		'Shows inactive profiles, oldest activity first (Moderator+).',
		'Lists the members eligible for the monthly raffle.'
	],
	usage: ['view [member]', 'role <role>', 'create', 'all', 'active [rank]', 'inactive', 'raffle'],
	guildSpecific: ['420803245758480405', '668330890790699079'],
	permissionLevel: 'Everyone',
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Scouter profiles and leaderboards.')
		.addSubcommand((sub) =>
			sub
				.setName('view')
				.setDescription('Show your profile, or another member’s.')
				.addUserOption((o) => o.setName('member').setDescription('Member to look up (Moderator+)'))
		)
		.addSubcommand((sub) =>
			sub
				.setName('role')
				.setDescription('Show the profiles of everyone with a role.')
				.addRoleOption((o) => o.setName('role').setDescription('Role to look up').setRequired(true))
		)
		.addSubcommand((sub) => sub.setName('create').setDescription('Create your profile.'))
		.addSubcommand((sub) => sub.setName('all').setDescription('Top scouters by merch count.'))
		.addSubcommand((sub) =>
			sub
				.setName('active')
				.setDescription('Active profiles.')
				.addStringOption((o) =>
					o
						.setName('rank')
						.setDescription('Only this rank')
						.addChoices({ name: 'Scouter', value: 'scouter' }, { name: 'Verified Scouter', value: 'verified' })
				)
		)
		.addSubcommand((sub) => sub.setName('inactive').setDescription('Inactive profiles, oldest activity first.'))
		.addSubcommand((sub) => sub.setName('raffle').setDescription('Members eligible for the monthly raffle.')),
	slash: async (client, interaction) => {
		const scouters = client.database.scoutTracker
		const subcommand = interaction.options.getSubcommand()
		const { guild, member, user } = interaction

		if (subcommand === 'create') {
			if (await scouters.findOne({ userID: user.id })) {
				return interaction.reply({ content: 'You already have a profile.', flags: MessageFlags.Ephemeral })
			}
			const now = Date.now()
			await scouters.insertOne({
				userID: user.id,
				author: member.nickname ?? user.username,
				firstTimestamp: now,
				firstTimestampReadable: new Date(now),
				lastTimestamp: now,
				lastTimestampReadable: new Date(now),
				count: 0,
				active: 1,
				otherCount: 0,
				assigned: []
			})
			return interaction.reply({ content: 'Your profile has been created. Use `/profile view` to see it.' })
		}

		await interaction.deferReply()

		const botRole = guild.members.me.roles.cache.find((r) => r.managed)
		const memberRoles = member.roles.highest.position
		const isStaff = memberRoles > botRole.position
		const noPermission = () => interaction.editReply({ content: "You don't have permission to use this command." })

		const sendPages = async (fields, title, desc = '') => {
			if (!fields.length) return interaction.editReply({ content: 'There are no matching profiles.' })
			const embeds = paginate(fields, { author: user }, title, desc)
			const msg = await interaction.editReply({ embeds: [embeds[0].setFooter(footer(client, 0, embeds.length))] })
			if (embeds.length > 1) await paginateFollowUP(msg, { author: user }, 0, embeds, client)
		}

		switch (subcommand) {
			case 'view': {
				const target = interaction.options.getUser('member') ?? user
				if (target.id !== user.id && !isStaff) return noPermission()

				const profile = await scouters.findOne({ userID: target.id })
				if (!profile) {
					return interaction.editReply({
						content:
							target.id === user.id
								? "You don't have a profile yet. Use `/profile create` to make one."
								: `\`${target.username}\` does not have a profile.`
					})
				}

				const fetchedMember = await guild.members.fetch(target.id)
				const roles = fetchedMember.roles.cache.filter((r) => r.id !== guild.id)
				const assigned = roles
					.filter((r) => r.position > botRole.position)
					.sort((a, b) => b.position - a.position)
					.map((r) => `<@&${r.id}>`)
				const selfAssigned = roles.filter((r) => r.position < botRole.position).map((r) => `<@&${r.id}>`)

				const old = profile.oldScout
				const bonus = (n) => (old ? `(+${n})` : '')
				const alt1Merch = (profile.alt1?.merchantCount ?? 0) + (profile.alt1First?.merchantCount ?? 0)
				const alt1Other = (profile.alt1?.otherCount ?? 0) + (profile.alt1First?.otherCount ?? 0)
				const oldAlt1Merch = (old?.alt1?.merchantCount ?? 0) + (old?.alt1First?.merchantCount ?? 0)
				const oldAlt1Other = (old?.alt1?.otherCount ?? 0) + (old?.alt1First?.otherCount ?? 0)

				const embed = new EmbedBuilder()
					.setTitle(`Member Profile - ${target.id}`)
					.setDescription('Current tracked stats in this server.')
					.setColor(Color.aqua)
					.setThumbnail(target.displayAvatarURL())
					.setFooter({
						text: 'Something wrong or missing? Let a Moderator+ know!',
						iconURL: client.user.displayAvatarURL()
					})
					.setTimestamp()
					.addFields(
						{
							name: `${profile.author}`,
							value: [
								`Merch count: ${profile.count} ${bonus(old?.count)}`,
								`Alt1 Merch count: ${alt1Merch} ${bonus(oldAlt1Merch)}`,
								`Other count: ${profile.otherCount} ${bonus(old?.otherCount)}`,
								`Alt1 Other count: ${alt1Other} ${bonus(oldAlt1Other)}`,
								`Active for: ${ms(profile.lastTimestamp - profile.firstTimestamp)}`
							].join('\n'),
							inline: true
						},
						{ name: 'Assigned Roles:', value: assigned.join(', ') || codeText('None'), inline: true },
						{ name: '​', value: '​', inline: true },
						{ name: 'Self-Assign Roles:', value: selfAssigned.join(', ') || codeText('None'), inline: true }
					)
				return interaction.editReply({ embeds: [embed] })
			}

			case 'role': {
				if (!isStaff) return noPermission()
				const role = interaction.options.getRole('role')
				if (botRole.position > role.position) {
					return interaction.editReply({ content: `You can't view the stats for \`${role.name}\`.` })
				}
				if (role.position > memberRoles) {
					return interaction.editReply({ content: `You don't have permission to view the stats for \`${role.name}\`.` })
				}
				const profiles = (await scouters.find({ userID: { $in: role.members.map((m) => m.id) } }).toArray()).sort(
					(a, b) => b.count - a.count
				)
				return sendPages(leaderboardFields(profiles), role.name)
			}

			case 'all': {
				const profiles = (await scouters.find({ count: { $gte: LEADERBOARD_MIN_COUNT } }).toArray()).sort(
					(a, b) => b.count - a.count
				)
				return sendPages(leaderboardFields(profiles), 'All')
			}

			case 'active': {
				if (!isStaff) return noPermission()
				const rank = interaction.options.getString('rank')
				let query = { count: { $gte: LEADERBOARD_MIN_COUNT } }
				if (rank === 'scouter') {
					const scouter = guild.roles.cache.find((r) => r.name.toLowerCase() === 'scouter')
					query = { 'assigned.0': scouter.id, active: 1 }
				} else if (rank === 'verified') {
					const verified = guild.roles.cache.find((r) => r.name.toLowerCase() === 'verified scouter')
					query = { 'assigned.1': verified.id, active: 1, lastTimestamp: { $gte: Date.now() - ONE_MONTH_MS } }
				}
				const profiles = (await scouters.find(query).toArray()).filter((p) => p.active).sort((a, b) => b.count - a.count)
				return sendPages(leaderboardFields(profiles), 'Active', rank ? capitalise(rank) : '')
			}

			case 'inactive': {
				if (!isStaff) return noPermission()
				const profiles = (await scouters.find({ count: { $gte: LEADERBOARD_MIN_COUNT } }).toArray())
					.filter((p) => !p.active)
					.sort((a, b) => a.lastTimestamp - b.lastTimestamp)
				return sendPages(leaderboardFields(profiles, { lastActive: true }), 'Inactive', 'inactive')
			}

			case 'raffle': {
				const verified = guild.roles.cache.find((r) => r.name.toLowerCase() === 'verified scouter')
				const names = (
					await scouters
						.find({ 'assigned.1': verified.id, active: 1, lastTimestamp: { $gte: Date.now() - ONE_MONTH_MS } })
						.toArray()
				)
					.sort((a, b) => b.count - a.count)
					.map((p) => p.author)
				return interaction.editReply({ content: `List of eligible members for the monthly raffle!\n${names.join('\n')}` })
			}
		}
	}
}
