import test from 'node:test'
import assert from 'node:assert/strict'

import {
	parseWorldList,
	validateRegistry,
	deriveMemberWorlds,
	specialsForWorld,
	applyWorldsToBase,
	applyWorldsToSpecial,
	removeWorldsFromBase,
	removeWorldsFromSpecial,
	setSpecialEnabled,
	setSpecialWorlds,
	diffRegistry,
	summariseChange,
	REGISTRY_DOCUMENT_ID,
	MAX_ICONS_PER_WORLD
} from '../src/dsf/calls/worldRegistry.js'

const registry = (overrides = {}) => ({
	_id: REGISTRY_DOCUMENT_ID,
	version: 1,
	baseWorlds: Array.from({ length: 60 }, (_, i) => i + 1),
	specials: [
		{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] },
		{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [211, 212] }
	],
	...overrides
})

test('parseWorldList accepts a comma separated list', () => {
	assert.deepEqual(parseWorldList('13,142,211'), [13, 142, 211])
})

test('parseWorldList accepts spaces as separators', () => {
	assert.deepEqual(parseWorldList('13 142 211'), [13, 142, 211])
})

test('parseWorldList expands ranges', () => {
	assert.deepEqual(parseWorldList('211-214'), [211, 212, 213, 214])
})

test('parseWorldList mixes ranges and singles, sorted and deduplicated', () => {
	assert.deepEqual(parseWorldList('261-263, 13, 262'), [13, 261, 262, 263])
})

test('parseWorldList rejects a non numeric entry', () => {
	assert.throws(() => parseWorldList('13,abc'), /abc/)
})

test('parseWorldList rejects a world outside 1-999', () => {
	assert.throws(() => parseWorldList('1000'), /1-999/)
})

test('parseWorldList rejects a backwards range', () => {
	assert.throws(() => parseWorldList('220-211'), /range/)
})

test('parseWorldList rejects an empty input', () => {
	assert.throws(() => parseWorldList('   '), /no worlds/i)
})

test('deriveMemberWorlds unions base worlds with enabled specials', () => {
	const worlds = deriveMemberWorlds(registry())

	assert.ok(worlds.includes(211))
	assert.ok(worlds.includes(116))
})

test('deriveMemberWorlds excludes disabled specials', () => {
	const worlds = deriveMemberWorlds(
		registry({ specials: [{ key: 'leagues', label: 'Leagues', enabled: false, worlds: [211] }] })
	)

	assert.ok(!worlds.includes(211))
})

test('deriveMemberWorlds keeps a base world when its special is disabled', () => {
	const worlds = deriveMemberWorlds(
		registry({ specials: [{ key: 'leagues', label: 'Leagues', enabled: false, worlds: [13, 211] }] })
	)

	assert.ok(worlds.includes(13))
	assert.ok(!worlds.includes(211))
})

test('deriveMemberWorlds returns a sorted unique list', () => {
	const worlds = deriveMemberWorlds(
		registry({
			specials: [
				{ key: 'dsf', label: 'DSF', enabled: true, worlds: [9] },
				{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [9, 211] }
			]
		})
	)

	assert.equal(worlds.filter((w) => w === 9).length, 1)
	assert.deepEqual(
		worlds,
		[...worlds].sort((a, b) => a - b)
	)
})

test('specialsForWorld returns every enabled special in document order', () => {
	const current = registry({
		specials: [
			{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] },
			{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [116] }
		]
	})

	assert.deepEqual(
		specialsForWorld(current, 116).map((s) => s.key),
		['dsf', 'leagues']
	)
})

test('specialsForWorld skips disabled specials', () => {
	const current = registry({
		specials: [
			{ key: 'leagues', label: 'Leagues', enabled: false, worlds: [116] },
			{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] }
		]
	})

	assert.deepEqual(
		specialsForWorld(current, 116).map((s) => s.key),
		['dsf']
	)
})

test('validateRegistry accepts a well formed registry', () => {
	assert.deepEqual(validateRegistry(registry()), [])
})

test('validateRegistry rejects fewer than 50 base worlds', () => {
	const errors = validateRegistry(registry({ baseWorlds: [1, 2, 3] }))

	assert.match(errors.join(' '), /at least 50/)
})

test('validateRegistry rejects a world outside 1-999', () => {
	const errors = validateRegistry(registry({ specials: [{ key: 'x', label: 'X', enabled: true, worlds: [9999] }] }))

	assert.match(errors.join(' '), /1-999/)
})

test('validateRegistry rejects duplicate worlds inside one special', () => {
	const errors = validateRegistry(registry({ specials: [{ key: 'x', label: 'X', enabled: true, worlds: [211, 211] }] }))

	assert.match(errors.join(' '), /duplicate/i)
})

test('validateRegistry rejects duplicate special keys', () => {
	const errors = validateRegistry(
		registry({
			specials: [
				{ key: 'leagues', label: 'A', enabled: true, worlds: [211] },
				{ key: 'leagues', label: 'B', enabled: true, worlds: [212] }
			]
		})
	)

	assert.match(errors.join(' '), /duplicate/i)
})

test('validateRegistry rejects a malformed key', () => {
	const errors = validateRegistry(registry({ specials: [{ key: 'Leagues 2026!', label: 'X', enabled: true, worlds: [211] }] }))

	assert.match(errors.join(' '), /key/i)
})

test('validateRegistry rejects more than three icons on one world', () => {
	const errors = validateRegistry(
		registry({
			specials: ['a', 'b', 'c', 'd'].map((key) => ({ key, label: key, enabled: true, worlds: [116] }))
		})
	)

	assert.match(errors.join(' '), new RegExp(`at most ${MAX_ICONS_PER_WORLD}`))
})

test('validateRegistry allows a fourth special on a world when it is disabled', () => {
	const errors = validateRegistry(
		registry({
			specials: [
				...['a', 'b', 'c'].map((key) => ({ key, label: key, enabled: true, worlds: [116] })),
				{ key: 'd', label: 'd', enabled: false, worlds: [116] }
			]
		})
	)

	assert.deepEqual(errors, [])
})

test('applyWorldsToSpecial adds worlds to an existing special without touching others', () => {
	const next = applyWorldsToSpecial(registry(), 'leagues', [213])

	assert.deepEqual(next.specials.find((s) => s.key === 'leagues').worlds, [211, 212, 213])
	assert.deepEqual(next.specials.find((s) => s.key === 'dsf').worlds, [116])
})

test('applyWorldsToSpecial is idempotent for worlds already present', () => {
	const next = applyWorldsToSpecial(registry(), 'leagues', [211])

	assert.deepEqual(next.specials.find((s) => s.key === 'leagues').worlds, [211, 212])
})

test('applyWorldsToSpecial creates the special when the key is unknown', () => {
	const next = applyWorldsToSpecial(registry(), 'newthing', [300], { label: 'New Thing' })

	const created = next.specials.find((s) => s.key === 'newthing')
	assert.deepEqual(created.worlds, [300])
	assert.equal(created.label, 'New Thing')
	assert.equal(created.enabled, true)
})

test('applyWorldsToSpecial does not mutate the input registry', () => {
	const before = registry()
	applyWorldsToSpecial(before, 'leagues', [213])

	assert.deepEqual(before.specials.find((s) => s.key === 'leagues').worlds, [211, 212])
})

test('removeWorldsFromSpecial removes only from the named special', () => {
	const current = registry({
		specials: [
			{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] },
			{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [116, 211] }
		]
	})

	const next = removeWorldsFromSpecial(current, 'leagues', [116])

	assert.deepEqual(next.specials.find((s) => s.key === 'leagues').worlds, [211])
	assert.deepEqual(next.specials.find((s) => s.key === 'dsf').worlds, [116])
})

test('removeWorldsFromSpecial drops a special left with no worlds', () => {
	const next = removeWorldsFromSpecial(registry(), 'dsf', [116])

	assert.equal(
		next.specials.find((s) => s.key === 'dsf'),
		undefined
	)
	assert.ok(next.specials.find((s) => s.key === 'leagues'))
})

test('removeWorldsFromSpecial throws for an unknown key', () => {
	assert.throws(() => removeWorldsFromSpecial(registry(), 'nope', [211]), /nope/)
})

test('setSpecialEnabled flips the flag', () => {
	const next = setSpecialEnabled(registry(), 'leagues', false)

	assert.equal(next.specials.find((s) => s.key === 'leagues').enabled, false)
})

test('setSpecialEnabled throws for an unknown key', () => {
	assert.throws(() => setSpecialEnabled(registry(), 'nope', true), /nope/)
})

test('diffRegistry reports worlds gained by enabling a special', () => {
	const before = registry({ specials: [{ key: 'leagues', label: 'Leagues', enabled: false, worlds: [211, 212] }] })
	const after = setSpecialEnabled(before, 'leagues', true)

	const diff = diffRegistry(before, after)

	assert.deepEqual(diff.gained, [211, 212])
	assert.deepEqual(diff.lost, [])
})

test('diffRegistry reports worlds lost by disabling a special', () => {
	const before = registry()
	const after = setSpecialEnabled(before, 'leagues', false)

	const diff = diffRegistry(before, after)

	assert.deepEqual(diff.lost, [211, 212])
})

test('diffRegistry reports no member change when the world survives via another list', () => {
	const before = registry({
		baseWorlds: Array.from({ length: 60 }, (_, i) => i + 1),
		specials: [{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [13] }]
	})
	const after = setSpecialEnabled(before, 'leagues', false)

	const diff = diffRegistry(before, after)

	assert.deepEqual(diff.lost, [])
})

test('diffRegistry reports the member world counts on both sides', () => {
	const before = registry()
	const after = setSpecialEnabled(before, 'leagues', false)

	const diff = diffRegistry(before, after)

	assert.equal(diff.memberCountBefore - diff.memberCountAfter, 2)
})

test('setSpecialWorlds replaces the world list wholesale', () => {
	const next = setSpecialWorlds(registry(), 'leagues', [301, 302])

	assert.deepEqual(next.specials.find((s) => s.key === 'leagues').worlds, [301, 302])
})

test('setSpecialWorlds keeps the enabled state and label', () => {
	const before = registry({
		specials: [{ key: 'leagues', label: 'Leagues', enabled: false, worlds: [211] }]
	})

	const next = setSpecialWorlds(before, 'leagues', [301])
	const leagues = next.specials.find((s) => s.key === 'leagues')

	assert.equal(leagues.enabled, false)
	assert.equal(leagues.label, 'Leagues')
})

test('setSpecialWorlds creates the special when the key is unknown', () => {
	const next = setSpecialWorlds(registry(), 'newthing', [301], { label: 'New Thing' })

	assert.deepEqual(next.specials.find((s) => s.key === 'newthing').worlds, [301])
})

test('setSpecialWorlds does not touch other specials', () => {
	const next = setSpecialWorlds(registry(), 'leagues', [301])

	assert.deepEqual(next.specials.find((s) => s.key === 'dsf').worlds, [116])
})

test('setSpecialWorlds sorts and deduplicates the new list', () => {
	const next = setSpecialWorlds(registry(), 'leagues', [303, 301, 301])

	assert.deepEqual(next.specials.find((s) => s.key === 'leagues').worlds, [301, 303])
})

test('setSpecialWorlds rejects an empty list rather than leaving an empty group', () => {
	assert.throws(() => setSpecialWorlds(registry(), 'leagues', []), /at least one world/)
})

test('applyWorldsToBase adds worlds to the base list', () => {
	const next = applyWorldsToBase(registry(), [300, 301])

	assert.ok(next.baseWorlds.includes(300))
	assert.ok(next.baseWorlds.includes(301))
})

test('applyWorldsToBase keeps the list sorted and deduplicated', () => {
	const next = applyWorldsToBase(registry(), [300, 5, 300])

	assert.equal(next.baseWorlds.filter((w) => w === 5).length, 1)
	assert.deepEqual(
		next.baseWorlds,
		[...next.baseWorlds].sort((a, b) => a - b)
	)
})

test('applyWorldsToBase does not mutate the input', () => {
	const before = registry()
	applyWorldsToBase(before, [300])

	assert.ok(!before.baseWorlds.includes(300))
})

test('applyWorldsToBase leaves the specials alone', () => {
	const next = applyWorldsToBase(registry(), [300])

	assert.deepEqual(next.specials, registry().specials)
})

test('removeWorldsFromBase removes only from the base list', () => {
	const next = removeWorldsFromBase(registry(), [5])

	assert.ok(!next.baseWorlds.includes(5))
	assert.deepEqual(next.specials, registry().specials)
})

test('removeWorldsFromBase refuses to drop below the safety floor', () => {
	const small = registry({ baseWorlds: Array.from({ length: 51 }, (_, i) => i + 1) })

	assert.throws(() => removeWorldsFromBase(small, [1, 2]), /at least 50/)
})

test('removeWorldsFromBase allows a removal that stays at the floor', () => {
	const small = registry({ baseWorlds: Array.from({ length: 51 }, (_, i) => i + 1) })

	assert.equal(removeWorldsFromBase(small, [1]).baseWorlds.length, 50)
})

test('a base world removed while still in an enabled special stays a member world', () => {
	const before = registry({
		specials: [{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [5] }]
	})
	const after = removeWorldsFromBase(before, [5])

	assert.ok(deriveMemberWorlds(after).includes(5))
})

test('summariseChange reports a base world addition', () => {
	const before = registry()
	const after = applyWorldsToBase(before, [300])

	const summary = summariseChange(before, after, { action: 'base add', key: 'baseWorlds', worlds: [300] })

	assert.match(summary.text, /300/)
	assert.match(summary.text, /Base worlds: 60 → 61/)
})

test('summariseChange reports a base world removal', () => {
	const before = registry()
	const after = removeWorldsFromBase(before, [5])

	const summary = summariseChange(before, after, { action: 'base remove', key: 'baseWorlds', worlds: [5] })

	assert.match(summary.text, /Base worlds: 60 → 59/)
})
