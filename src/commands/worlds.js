import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js'

import Color from '../colors.js'
import {
	applyWorldsToSpecial,
	deriveMemberWorlds,
	formatWorldList,
	loadRegistry,
	parseWorldList,
	removeWorldsFromSpecial,
	saveRegistry,
	setSpecialEnabled,
	setSpecialWorlds,
	sourcesForWorld,
	specialsForWorld,
	summariseChange
} from '../dsf/calls/worldRegistry.js'
import { customEmojiId, emojiForKey, invalidateRegistryCache } from '../dsf/calls/worlds.js'

const CONFIRM_TIMEOUT_MS = 60_000

/** Discord's hard limit on fields in a single embed. */
const MAX_EMBED_FIELDS = 25

const worldsOption = (option, description) => option.setName('worlds').setDescription(description).setRequired(true)

const keyOption = (option) => option.setName('key').setDescription('The special world group, e.g. leagues').setRequired(true)

export default {
	name: 'worlds',
	// One description per usage entry: help.js pairs them by index.
	description: [
		'Shows every special world group, whether it is enabled, and how many worlds it holds.',
		'Shows which lists a world belongs to, whether it is a member world, and its icons.',
		'Enables a group, adding its worlds to the member worlds every service polls.',
		'Disables a group, removing its worlds from the member worlds.',
		"Replaces a group's worlds outright. Use this for a new league season.",
		'Adds worlds to a group, creating the group if the key is new.',
		'Removes worlds from a group. Other groups keep their copies of those worlds.'
	],
	usage: [
		'list',
		'show <world>',
		'enable <key>',
		'disable <key>',
		'set <key> <worlds>',
		'add <key> <worlds>',
		'remove <key> <worlds>'
	],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('worlds')
		.setDescription('Manage the shared world registry.')
		.addSubcommand((sub) => sub.setName('list').setDescription('Show every special world group and its state.'))
		.addSubcommand((sub) =>
			sub
				.setName('show')
				.setDescription('Show which lists a world belongs to.')
				.addIntegerOption((option) => option.setName('world').setDescription('World number').setRequired(true))
		)
		.addSubcommand((sub) =>
			sub
				.setName('enable')
				.setDescription('Enable a special world group, adding its worlds to the member worlds.')
				.addStringOption(keyOption)
		)
		.addSubcommand((sub) =>
			sub
				.setName('disable')
				.setDescription('Disable a special world group, removing its worlds from the member worlds.')
				.addStringOption(keyOption)
		)
		.addSubcommand((sub) =>
			sub
				.setName('set')
				.setDescription("Replace a group's worlds outright — use this for a new league season.")
				.addStringOption(keyOption)
				.addStringOption((option) => worldsOption(option, 'e.g. 13,142,211-219,261-298'))
				.addStringOption((option) =>
					option.setName('label').setDescription('Display name, used when creating a new group').setRequired(false)
				)
		)
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add worlds to a special world group, creating it if new.')
				.addStringOption(keyOption)
				.addStringOption((option) => worldsOption(option, 'e.g. 13,142,211-219,261-298'))
				.addStringOption((option) =>
					option.setName('label').setDescription('Display name, used when creating a new group').setRequired(false)
				)
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove worlds from a special world group.')
				.addStringOption(keyOption)
				.addStringOption((option) => worldsOption(option, 'e.g. 253,254'))
		),
	slash: async (client, interaction, perms) => {
		if (!perms.admin) return interaction.reply(perms.errorA)

		const collection = client.database.settings
		const registry = await loadRegistry(collection)
		const subcommand = interaction.options.getSubcommand()

		if (subcommand === 'list') return replyWithList(interaction, registry)
		if (subcommand === 'show') return replyWithWorld(interaction, registry)

		const key = interaction.options.getString('key')

		let next
		let worlds = []
		try {
			if (subcommand === 'enable' || subcommand === 'disable') {
				next = setSpecialEnabled(registry, key, subcommand === 'enable')
				worlds = registry.specials.find((special) => special.key === key)?.worlds ?? []
			} else {
				worlds = parseWorldList(interaction.options.getString('worlds'))
				const label = interaction.options.getString('label')

				if (subcommand === 'set') next = setSpecialWorlds(registry, key, worlds, { label })
				else if (subcommand === 'add') next = applyWorldsToSpecial(registry, key, worlds, { label })
				else next = removeWorldsFromSpecial(registry, key, worlds)
			}
		} catch (error) {
			return interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral })
		}

		const summary = summariseChange(registry, next, { action: subcommand, key, worlds })
		if (summary.blocked) {
			return interaction.reply({ content: `❌ ${summary.text}`, flags: MessageFlags.Ephemeral })
		}

		await confirmAndSave(client, interaction, { collection, registry: next, summary, key, subcommand })
	}
}

/** Shown when a group's emoji is unmapped, or missing from this bot's cache. */
export const FALLBACK_LIST_ICON = '🔹'

/**
 * The icon for a group in /worlds list: its own emoji where possible.
 *
 * Custom emoji are resolved through the bot's cache, because a DEV bot in a
 * server without the production emoji set would otherwise render the raw
 * `<:name:id>` text. Unicode emoji need no resolving. Enabled state is carried
 * by the section a group sits in, not by its icon.
 */
export const listIcon = (special, emojiCache) => {
	const emoji = emojiForKey(special.key)
	if (!emoji) return FALLBACK_LIST_ICON

	const customId = customEmojiId(emoji)
	if (!customId) return emoji

	return emojiCache?.get(customId) ? emoji : FALLBACK_LIST_ICON
}

/**
 * Embed fields for /worlds list, split into Enabled and Disabled sections.
 *
 * A heading is only emitted when that section has groups, so a registry with
 * everything switched on does not show an empty Disabled block.
 */
export const buildListSections = (specials, emojiCache) => {
	const fields = []
	let omitted = 0

	for (const [heading, enabled] of [
		['Enabled', true],
		['Disabled', false]
	]) {
		const section = specials.filter((special) => special.enabled === enabled)
		if (!section.length) continue

		fields.push({ name: heading, value: '​', inline: false })
		for (const special of section) {
			// Discord rejects an embed with more than 25 fields, and adding
			// groups is exactly what this command is for. Leave room for the
			// second heading and the notice below.
			if (fields.length >= MAX_EMBED_FIELDS - 2) {
				omitted += 1
				continue
			}

			fields.push({
				name: `${listIcon(special, emojiCache)} ${special.label} (\`${special.key}\`)`,
				value: `${special.worlds.length} world${special.worlds.length === 1 ? '' : 's'}: ${formatWorldList(
					special.worlds
				)}`.slice(0, 1024),
				inline: false
			})
		}
	}

	if (omitted) {
		fields.push({ name: '​', value: `…and ${omitted} more group${omitted === 1 ? '' : 's'}.`, inline: false })
	}

	return fields
}

const replyWithList = (interaction, registry) => {
	const embed = new EmbedBuilder()
		.setTitle(`World registry v${registry.version}`)
		.setColor(Color.cream)
		.setDescription(
			`**${deriveMemberWorlds(registry).length}** member worlds from ${registry.baseWorlds.length} base worlds ` +
				`and ${registry.specials.filter((special) => special.enabled).length} enabled groups.`
		)

	const fields = buildListSections(registry.specials, interaction.client?.emojis?.cache)
	if (fields.length) embed.addFields(...fields)

	if (registry.version === 0) {
		embed.setFooter({ text: 'No registry stored yet — these are the bundled defaults. The first change writes them.' })
	}

	return interaction.reply({ embeds: [embed] })
}

const replyWithWorld = (interaction, registry) => {
	const world = interaction.options.getInteger('world')
	const sources = sourcesForWorld(registry, world)
	const icons = specialsForWorld(registry, world)
	const isMember = deriveMemberWorlds(registry).includes(world)

	const lines = [
		`Member world: ${isMember ? 'yes' : 'no'}`,
		`In lists: ${sources.length ? sources.map((s) => `\`${s.key}\`${s.enabled ? '' : ' (disabled)'}`).join(', ') : 'none'}`,
		`Icons: ${icons.length ? icons.map((s) => `\`${s.key}\``).join(', ') : 'none'}`
	]

	return interaction.reply({
		embeds: [new EmbedBuilder().setTitle(`World ${world}`).setColor(Color.cream).setDescription(lines.join('\n'))]
	})
}

/**
 * Show the effect, wait for a confirmation click, then write.
 *
 * The registry drives which worlds the server polls, so every mutation is
 * previewed rather than applied straight away.
 */
const confirmAndSave = async (client, interaction, { collection, registry, summary, key, subcommand }) => {
	const confirmId = `worlds-confirm-${interaction.id}`
	const cancelId = `worlds-cancel-${interaction.id}`

	const buttons = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(confirmId).setLabel('Confirm').setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
	)

	const embed = new EmbedBuilder()
		.setTitle(`Pending change: ${subcommand} \`${key}\``)
		.setColor(Color.cream)
		.setDescription(summary.text)

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
			embeds: [embed.setFooter({ text: 'Timed out — nothing was changed.' })],
			components: []
		})
	}

	if (click.customId === cancelId) {
		return click.update({ embeds: [embed.setFooter({ text: 'Cancelled — nothing was changed.' })], components: [] })
	}

	try {
		const saved = await saveRegistry(collection, registry, interaction.user.id)
		invalidateRegistryCache()
		await click.update({
			embeds: [embed.setFooter({ text: `Applied as v${saved.version} by ${interaction.user.tag}` })],
			components: []
		})
	} catch (error) {
		client.logger?.error?.(`Failed to write the world registry: ${error.message}`)
		await click.update({ embeds: [embed.setFooter({ text: `Write failed: ${error.message}` })], components: [] })
	}
}
