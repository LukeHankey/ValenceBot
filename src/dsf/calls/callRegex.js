/**
 * Call-matching regexes, built from the world registry.
 *
 * These used to be literals in constants.js with the world numbers spelled out
 * as an alternation:
 *
 *     (([124569]|1[0234568]|…|21[12-479]|22[67-9]|238|25[2-47-9]|26[1-9]|…)
 *
 * That list was last season's league worlds. When the worlds changed, calls on
 * the new ones — `sm 172`, `sm 143` — stopped matching and were routed to the
 * spam channel instead of being counted. Nobody edits a regex when a season
 * starts, so it drifts every time.
 *
 * Building them from the registry means a season needs `/worlds set leagues …`
 * and nothing else.
 */

import { deriveMemberWorlds } from './worldRegistry.js'

/** The call prefixes: every event abbreviation and full name. */
const EVENT_PREFIXES = [
	'wp',
	'j',
	'jf',
	'wh',
	'sm',
	'tt',
	'a',
	'ark',
	'whirlpool',
	'whale',
	'jelly',
	'jellyfish',
	'pool',
	'sea monster',
	'treasure turtle',
	'turtle',
	'arkaneo',
	'sailfish'
]

/** The foreign form also allows a bare world prefix, e.g. "world 299". */
const FOREIGN_PREFIXES = ['w', 'world', ...EVENT_PREFIXES]

// What may follow the world number: a separator, "ua"/"f" markers, or free text.
const TRAILING = '(([,.\\s]|ua|f)?|\\s[\\W\\w\\+]*)*'

const prefixGroup = (prefixes) => `(?:${prefixes.join('|')}){1}`

// Longest first so 172 wins over 17 when both are members.
const worldGroup = (worlds) =>
	`(?:${[...worlds]
		.map(Number)
		.sort((a, b) => b - a)
		.join('|')})`

/** Matches a call on one of the given member worlds. */
export const buildCallRegex = (memberWorlds) =>
	new RegExp(`(^${prefixGroup(EVENT_PREFIXES)}\\s?(${worldGroup(memberWorlds)}${TRAILING})$)`, 'i')

/**
 * Matches a call on a world that is *not* a member world.
 *
 * Used to offer the "foreign world" buttons rather than counting the call.
 * Any 1-3 digit world that the registry does not know about qualifies, so this
 * no longer needs its own hardcoded list either.
 */
export const buildForeignWorldRegex = (memberWorlds) => {
	const members = new Set([...memberWorlds].map(Number))
	const foreign = []
	for (let world = 1; world <= 999; world++) if (!members.has(world)) foreign.push(world)

	return new RegExp(`(^${prefixGroup(FOREIGN_PREFIXES)}\\s?(${worldGroup(foreign)}${TRAILING})$)`, 'i')
}

/**
 * Cached per registry version.
 *
 * Both regexes are rebuilt only when the registry changes: the foreign one
 * enumerates every non-member world up to 999, which is not work to repeat on
 * every message in a busy call channel.
 */
const cache = { version: null, call: null, foreign: null }

const refresh = (registry) => {
	if (cache.version === registry.version && cache.call) return

	const memberWorlds = deriveMemberWorlds(registry)
	cache.version = registry.version
	cache.call = buildCallRegex(memberWorlds)
	cache.foreign = buildForeignWorldRegex(memberWorlds)
}

export const callRegexFor = (registry) => {
	refresh(registry)
	return cache.call
}

export const foreignWorldRegexFor = (registry) => {
	refresh(registry)
	return cache.foreign
}
