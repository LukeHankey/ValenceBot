import { loadRegistry, specialsForWorld, FALLBACK_REGISTRY } from './worldRegistry.js'

/**
 * Discord emoji for each special world key.
 *
 * The registry stores keys, not emoji: the same key names a PNG in the Alt1
 * client and an emoji here, so adding worlds to an existing key needs no code
 * change in either. A key with no entry here simply gets no reaction.
 */
const WorldReactions = {
	legacy: '<:legacy:1023039209461788794>',
	vip: '<:VIP_badge:1023040160927055932>',
	quick_chat: '<:quick_chat:1023042542465450004>',
	eoc: '<:Revolution:1023042741262880808>',
	fifteen_plus: '<:1500_total:1023251995211071499>',
	twenty_plus: '<:2000_total:1023252045093933087>',
	twenty_six_plus: '<:2600_total:1023252076324724776>',
	laggy: '<:lag:1023271186047717406>',
	dsf: '🎣',
	sixty_nine: '<:nice:1120443938206122116>',
	leagues: '<:leagues:1417397814899642399>'
}

/** The emoji for a registry key, or undefined when the key has none. */
export const emojiForKey = (key) => WorldReactions[key]

/** The snowflake inside a custom emoji, or null for a unicode one. */
export const customEmojiId = (reaction) => /^<a?:.*:(\d+)>$/.exec(reaction)?.[1] ?? null

/** How long a loaded registry is reused before re-reading Mongo. */
const REGISTRY_CACHE_MS = 60_000

let cachedRegistry = FALLBACK_REGISTRY
let cachedAt = 0

/**
 * The registry, re-read at most once a minute.
 *
 * Reactions run on every call message, so this avoids a database round trip
 * per message while still picking up a `/worlds` change within a minute.
 */
export const getRegistry = async (collection) => {
	if (!collection) return cachedRegistry
	if (Date.now() - cachedAt < REGISTRY_CACHE_MS) return cachedRegistry

	cachedRegistry = await loadRegistry(collection)
	cachedAt = Date.now()
	return cachedRegistry
}

/** Drop the cached registry so the next read hits Mongo. Used after a write. */
export const invalidateRegistryCache = () => {
	cachedAt = 0
}

/**
 * Every emoji a world should be reacted with, in specials order.
 *
 * A world can belong to several enabled specials (leagues on the DSF world,
 * say), so this returns a list rather than the first match it finds.
 */
export const reactionsForWorld = (registry, world) =>
	specialsForWorld(registry, world)
		.map((special) => WorldReactions[special.key])
		.filter(Boolean)

/**
 * The world number a message is about, or null.
 *
 * The lookarounds matter: `\d{1,3}` on its own happily takes the first three
 * digits of a longer run, so "sm 1720" read as world 172 and "world 1720" as
 * world 172 — a typo silently became a real world. Worlds are 1-999, so a run
 * of four or more digits is not a world at all.
 *
 * This takes the first number in the message, which for a call ("wp 84") is
 * the world. It does not try to work out which number is meant in a sentence:
 * whether a message is a call at all is decided by the regexes in
 * callRegex.js, built from the registry.
 */
export const getWorldNumber = (message) => {
	const match = /world\s+(?<!\d)(\d{1,3})(?!\d)/i.exec(message) || /(?<!\d)(\d{1,3})(?!\d)/.exec(message)
	if (!match) return null

	const world = parseInt(match[1])

	// World 0 does not exist. Returning it was harmless only because callers
	// test falsiness, which quietly treats it as "no world".
	return world > 0 ? world : null
}

export const worldReaction = async (message) => {
	const worldNumber = getWorldNumber(message.content)
	if (worldNumber === null) return

	const registry = await getRegistry(message.client?.database?.settings)

	for (const reaction of reactionsForWorld(registry, worldNumber)) {
		const isCustomEmoji = /^<:.*:(\d+)>$/.exec(reaction)

		// DEV servers usually do not have the production custom emoji set.
		if (process.env.NODE_ENV === 'DEV' && isCustomEmoji) continue

		if (isCustomEmoji) {
			// Custom emoji have to be resolved from the client cache.
			const emoji = message.client.emojis.cache.get(isCustomEmoji[1])
			if (!emoji) {
				message.client.logger?.warn?.(`Emoji ${isCustomEmoji[1]} not found in cache. Skipping reaction.`)
				continue
			}
			await message.react(emoji)
			continue
		}

		await message.react(reaction)
	}
}
