/**
 * World registry: shared world configuration stored in Mongo.
 *
 * The same list of member worlds is needed by this bot, the DSF server and the
 * Alt1 client. It used to be hardcoded in all three, which is how they drifted
 * apart — the bot carried leagues on 253/254 while the other two carried
 * 142/218/237.
 *
 * The registry lives in the Settings collection under _id "WorldRegistry".
 * This module holds the pure logic: parsing, validation, derivation and diffs.
 * Everything here is side effect free so it can be tested without a database
 * and reused by the /worlds command.
 *
 * The validation rules mirror routes/worlds/registry.py in DSF-Server, which
 * re-checks them on read. Neither side trusts the other.
 */

import { DEFAULT_BASE_WORLDS, DEFAULT_SPECIALS } from './defaultWorlds.js'

export const REGISTRY_DOCUMENT_ID = 'WorldRegistry'

export const MIN_WORLD = 1
export const MAX_WORLD = 999

/** Guards against a truncating write emptying the polling list. */
export const MIN_BASE_WORLDS = 50

/** A world may carry several icons, but not a stripe of them. */
export const MAX_ICONS_PER_WORLD = 3

export const SPECIAL_KEY_PATTERN = /^[a-z][a-z0-9_]{0,31}$/

const sortNumeric = (worlds) => [...worlds].sort((a, b) => a - b)

const uniqueSorted = (worlds) => sortNumeric([...new Set(worlds)])

/**
 * Parse a user supplied world list: "13,142,211-219 261-298".
 *
 * Commas and whitespace both separate; "a-b" expands to an inclusive range.
 * Returns a sorted, deduplicated array of numbers, or throws with a message
 * meant to be shown to the user.
 */
export const parseWorldList = (input) => {
	if (!input || !input.trim()) throw new Error('Found no worlds in that input.')

	const tokens = input
		.split(/[\s,]+/)
		.map((token) => token.trim())
		.filter(Boolean)

	const worlds = []
	for (const token of tokens) {
		const range = /^(\d+)-(\d+)$/.exec(token)
		if (range) {
			const start = Number(range[1])
			const end = Number(range[2])
			if (start > end) throw new Error(`Invalid range \`${token}\`: the start is higher than the end.`)
			assertWorldInRange(start, token)
			assertWorldInRange(end, token)
			for (let world = start; world <= end; world++) worlds.push(world)
			continue
		}

		if (!/^\d+$/.test(token)) throw new Error(`\`${token}\` is not a world number.`)
		const world = Number(token)
		assertWorldInRange(world, token)
		worlds.push(world)
	}

	if (!worlds.length) throw new Error('Found no worlds in that input.')
	return uniqueSorted(worlds)
}

const assertWorldInRange = (world, token) => {
	if (world < MIN_WORLD || world > MAX_WORLD) {
		throw new Error(`\`${token}\` is outside the valid world range 1-999.`)
	}
}

/** baseWorlds plus the worlds of every enabled special, sorted. */
export const deriveMemberWorlds = (registry) => {
	const worlds = new Set(registry.baseWorlds)
	for (const special of registry.specials) {
		if (!special.enabled) continue
		for (const world of special.worlds) worlds.add(world)
	}
	return sortNumeric([...worlds])
}

/** Enabled specials containing a world, in document order — the icon order. */
export const specialsForWorld = (registry, world) =>
	registry.specials.filter((special) => special.enabled && special.worlds.includes(Number(world)))

/** Every list containing a world, enabled or not, for "why is this still here" answers. */
export const sourcesForWorld = (registry, world) => {
	const number = Number(world)
	const sources = []
	if (registry.baseWorlds.includes(number)) sources.push({ key: 'baseWorlds', enabled: true })
	for (const special of registry.specials) {
		if (special.worlds.includes(number)) sources.push({ key: special.key, enabled: special.enabled })
	}
	return sources
}

/**
 * Validate a whole registry. Returns an array of human readable problems,
 * empty when the registry is safe to write.
 */
export const validateRegistry = (registry) => {
	const errors = []

	if (!Array.isArray(registry.baseWorlds) || registry.baseWorlds.length < MIN_BASE_WORLDS) {
		errors.push(`baseWorlds must contain at least ${MIN_BASE_WORLDS} worlds, got ${registry.baseWorlds?.length ?? 0}.`)
	}

	errors.push(...worldListErrors(registry.baseWorlds ?? [], 'baseWorlds'))

	const keys = new Set()
	for (const special of registry.specials ?? []) {
		if (!SPECIAL_KEY_PATTERN.test(special.key)) {
			errors.push(`Special key \`${special.key}\` must match ${SPECIAL_KEY_PATTERN}.`)
		}
		if (keys.has(special.key)) errors.push(`Duplicate special key \`${special.key}\`.`)
		keys.add(special.key)

		if (!Array.isArray(special.worlds) || !special.worlds.length) {
			errors.push(`Special \`${special.key}\` must contain at least one world.`)
		}
		errors.push(...worldListErrors(special.worlds ?? [], `special \`${special.key}\``))
	}

	const iconCounts = new Map()
	for (const special of registry.specials ?? []) {
		if (!special.enabled) continue
		for (const world of special.worlds ?? []) iconCounts.set(world, (iconCounts.get(world) ?? 0) + 1)
	}
	const overloaded = [...iconCounts.entries()].filter(([, count]) => count > MAX_ICONS_PER_WORLD).map(([world]) => world)
	if (overloaded.length) {
		errors.push(`Worlds ${sortNumeric(overloaded).join(', ')} would carry at most ${MAX_ICONS_PER_WORLD} icons.`)
	}

	return errors
}

const worldListErrors = (worlds, label) => {
	const errors = []
	const seen = new Set()
	for (const world of worlds) {
		if (!Number.isInteger(world)) {
			errors.push(`${label} contains a non-numeric world: ${JSON.stringify(world)}.`)
			continue
		}
		if (world < MIN_WORLD || world > MAX_WORLD) {
			errors.push(`${label} world ${world} is outside the valid range 1-999.`)
		}
		if (seen.has(world)) errors.push(`${label} contains duplicate world ${world}.`)
		seen.add(world)
	}
	return errors
}

const cloneRegistry = (registry) => ({
	...registry,
	baseWorlds: [...registry.baseWorlds],
	specials: registry.specials.map((special) => ({ ...special, worlds: [...special.worlds] }))
})

const findSpecial = (registry, key) => registry.specials.find((special) => special.key === key)

/**
 * Add worlds to a special, creating it when the key is unknown.
 * Returns a new registry; the input is left alone.
 */
export const applyWorldsToSpecial = (registry, key, worlds, { label } = {}) => {
	const next = cloneRegistry(registry)
	const special = findSpecial(next, key)

	if (special) {
		special.worlds = uniqueSorted([...special.worlds, ...worlds])
		return next
	}

	next.specials.push({ key, label: label ?? key, enabled: true, worlds: uniqueSorted(worlds) })
	return next
}

/**
 * Remove worlds from one special only. Other lists are untouched.
 *
 * A special left with no worlds is dropped: an empty group is meaningless and
 * both this bot and the server reject one during validation. Re-adding worlds
 * under the same key recreates it.
 */
export const removeWorldsFromSpecial = (registry, key, worlds) => {
	const next = cloneRegistry(registry)
	const special = findSpecial(next, key)
	if (!special) throw new Error(`No special called \`${key}\`.`)

	const removing = new Set(worlds)
	special.worlds = special.worlds.filter((world) => !removing.has(world))

	if (!special.worlds.length) next.specials = next.specials.filter((entry) => entry.key !== key)
	return next
}

export const setSpecialEnabled = (registry, key, enabled) => {
	const next = cloneRegistry(registry)
	const special = findSpecial(next, key)
	if (!special) throw new Error(`No special called \`${key}\`.`)

	special.enabled = enabled
	return next
}

/**
 * What actually changes for the servers polling these worlds.
 *
 * Editing a special is not the same as changing the member world list: a world
 * removed from leagues stays a member world if it is also a base world or sits
 * in another enabled special. The diff reports the derived effect, which is
 * what the confirmation prompt shows.
 */
/**
 * Collapse a sorted world list into ranges: [261..300] becomes "261-300".
 * League seasons add fifty-odd consecutive worlds and an embed field is 1024
 * characters, so printing them one by one does not fit.
 */
export const formatWorldList = (worlds) => {
	if (!worlds.length) return 'none'

	const sorted = sortNumeric(worlds)
	const parts = []
	let start = sorted[0]
	let previous = sorted[0]

	for (const world of sorted.slice(1)) {
		if (world === previous + 1) {
			previous = world
			continue
		}
		parts.push(start === previous ? `${start}` : `${start}-${previous}`)
		start = world
		previous = world
	}
	parts.push(start === previous ? `${start}` : `${start}-${previous}`)

	return parts.join(', ')
}

/**
 * Describe what a pending change actually does, for the confirmation prompt.
 *
 * Editing a special is not the same as changing the member world list, so the
 * summary reports the derived effect: which worlds really join or leave, which
 * survive through another list, and how many icons a world ends up with.
 */
export const summariseChange = (before, after, { action, key, worlds = [] }) => {
	const errors = validateRegistry(after)
	if (errors.length) {
		return { blocked: true, text: `This change was rejected:\n${errors.map((error) => `• ${error}`).join('\n')}` }
	}

	const diff = diffRegistry(before, after)
	const lines = [`**${action}** \`${key}\``, `Member worlds: ${diff.memberCountBefore} → ${diff.memberCountAfter}`]

	if (diff.gained.length) lines.push(`Gained: ${formatWorldList(diff.gained)}`)
	if (diff.lost.length) lines.push(`Dropped from member worlds, polling stops: ${formatWorldList(diff.lost)}`)

	const lostSet = new Set(diff.lost)
	for (const world of worlds) {
		if (lostSet.has(world)) continue

		const stillIn = sourcesForWorld(after, world).filter((source) => source.enabled)
		if (!stillIn.length) continue

		lines.push(
			`World ${world} stays a member world via ${stillIn
				.map((source) => `\`${source.key}\``)
				.join(', ')} — icon change only.`
		)
	}

	const multiIcon = worlds
		.map((world) => ({ world, specials: specialsForWorld(after, world) }))
		.filter((entry) => entry.specials.length > 1)
	for (const entry of multiIcon) {
		lines.push(
			`World ${entry.world} now carries ${entry.specials.length} icons: ${entry.specials
				.map((special) => special.key)
				.join(', ')}`
		)
	}

	return { blocked: false, text: lines.join('\n') }
}

/**
 * The bundled defaults, used when Mongo holds no registry yet and as the seed
 * for the first write. Version 0 marks "this did not come from the database".
 */
export const FALLBACK_REGISTRY = {
	_id: REGISTRY_DOCUMENT_ID,
	version: 0,
	baseWorlds: DEFAULT_BASE_WORLDS,
	specials: DEFAULT_SPECIALS
}

/**
 * Read the registry from Mongo.
 *
 * An absent or invalid document falls back to the bundled defaults rather than
 * failing, so the reaction path keeps working while the document is fixed.
 */
export const loadRegistry = async (collection) => {
	let document
	try {
		document = await collection.findOne({ _id: REGISTRY_DOCUMENT_ID })
	} catch (error) {
		console.error('Could not read the world registry, using bundled defaults:', error)
		return FALLBACK_REGISTRY
	}

	if (!document) return FALLBACK_REGISTRY

	const errors = validateRegistry(document)
	if (errors.length) {
		console.error('Stored world registry is invalid, using bundled defaults:', errors.join(' '))
		return FALLBACK_REGISTRY
	}

	return document
}

/**
 * Write the whole registry back, bumping the version.
 *
 * The document is written in full rather than patched: the server watches this
 * collection with a change stream, and a whole-document write gives it the
 * complete new state to validate in one event.
 */
export const saveRegistry = async (collection, registry, userId) => {
	const errors = validateRegistry(registry)
	if (errors.length) throw new Error(errors.join(' '))

	const document = {
		_id: REGISTRY_DOCUMENT_ID,
		version: (registry.version ?? 0) + 1,
		baseWorlds: [...registry.baseWorlds],
		specials: registry.specials.map((special) => ({ ...special, worlds: [...special.worlds] })),
		updatedAt: new Date(),
		updatedBy: userId
	}

	await collection.replaceOne({ _id: REGISTRY_DOCUMENT_ID }, document, { upsert: true })
	return document
}

export const diffRegistry = (before, after) => {
	const memberBefore = deriveMemberWorlds(before)
	const memberAfter = deriveMemberWorlds(after)
	const beforeSet = new Set(memberBefore)
	const afterSet = new Set(memberAfter)

	return {
		gained: memberAfter.filter((world) => !beforeSet.has(world)),
		lost: memberBefore.filter((world) => !afterSet.has(world)),
		memberCountBefore: memberBefore.length,
		memberCountAfter: memberAfter.length
	}
}
