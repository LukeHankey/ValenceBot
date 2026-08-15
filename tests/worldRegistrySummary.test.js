import test from 'node:test'
import assert from 'node:assert/strict'

import {
	summariseChange,
	setSpecialEnabled,
	removeWorldsFromSpecial,
	applyWorldsToSpecial,
	REGISTRY_DOCUMENT_ID
} from '../src/dsf/calls/worldRegistry.js'

const registry = (overrides = {}) => ({
	_id: REGISTRY_DOCUMENT_ID,
	version: 1,
	baseWorlds: Array.from({ length: 60 }, (_, i) => i + 1),
	specials: [
		{ key: 'dsf', label: 'DSF world', enabled: true, worlds: [116] },
		{ key: 'leagues', label: 'Leagues', enabled: false, worlds: [13, 211, 212] }
	],
	...overrides
})

test('enabling a special reports the worlds gained', () => {
	const before = registry()
	const after = setSpecialEnabled(before, 'leagues', true)

	const summary = summariseChange(before, after, { action: 'enable', key: 'leagues' })

	assert.match(summary.text, /211/)
	assert.match(summary.text, /212/)
})

test('enabling a special reports the member world count change', () => {
	const before = registry()
	const after = setSpecialEnabled(before, 'leagues', true)

	const summary = summariseChange(before, after, { action: 'enable', key: 'leagues' })

	// 60 base worlds plus the enabled dsf world; leagues adds 211 and 212 (13 is already a base world).
	assert.match(summary.text, /61 → 63/)
})

test('a world already in baseWorlds is not counted as gained', () => {
	const before = registry()
	const after = setSpecialEnabled(before, 'leagues', true)

	const summary = summariseChange(before, after, { action: 'enable', key: 'leagues' })

	// World 13 is a base world, so enabling leagues changes its icon, not membership.
	assert.doesNotMatch(summary.text.split('Gained')[1] ?? '', /\b13\b/)
})

test('removing a world that survives elsewhere reports an icon-only change', () => {
	const before = registry({
		specials: [
			{ key: 'dsf', label: 'DSF world', enabled: true, worlds: [116] },
			{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [116] }
		]
	})
	const after = removeWorldsFromSpecial(before, 'leagues', [116])

	const summary = summariseChange(before, after, { action: 'remove', key: 'leagues', worlds: [116] })

	assert.match(summary.text, /icon/i)
	assert.match(summary.text, /dsf/)
})

test('removing a world that exists nowhere else reports it leaving the member worlds', () => {
	const before = registry({
		specials: [{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [211] }]
	})
	const after = removeWorldsFromSpecial(before, 'leagues', [211])

	const summary = summariseChange(before, after, { action: 'remove', key: 'leagues', worlds: [211] })

	assert.match(summary.text, /211/)
	assert.match(summary.text, /no longer|dropped|stops/i)
})

test('adding a world already carrying icons reports the resulting icon count', () => {
	const before = registry({
		specials: [{ key: 'dsf', label: 'DSF world', enabled: true, worlds: [116] }]
	})
	const after = applyWorldsToSpecial(before, 'leagues', [116], { label: 'Leagues' })

	const summary = summariseChange(before, after, { action: 'add', key: 'leagues', worlds: [116] })

	assert.match(summary.text, /2 icons|dsf, leagues/i)
})

test('a change that breaks validation is reported as blocked', () => {
	const before = registry()
	const after = { ...before, baseWorlds: [] }

	const summary = summariseChange(before, after, { action: 'remove', key: 'leagues', worlds: [] })

	assert.equal(summary.blocked, true)
	assert.match(summary.text, /at least 50/)
})

test('a valid change is not blocked', () => {
	const before = registry()
	const after = setSpecialEnabled(before, 'leagues', true)

	const summary = summariseChange(before, after, { action: 'enable', key: 'leagues' })

	assert.equal(summary.blocked, false)
})

test('long world lists are summarised as ranges rather than printed in full', () => {
	const before = registry({
		specials: [{ key: 'leagues', label: 'Leagues', enabled: false, worlds: Array.from({ length: 40 }, (_, i) => 261 + i) }]
	})
	const after = setSpecialEnabled(before, 'leagues', true)

	const summary = summariseChange(before, after, { action: 'enable', key: 'leagues' })

	assert.match(summary.text, /261-300/)
})

test('a removal from a disabled group still reports the group changing size', () => {
	const before = registry()
	const after = removeWorldsFromSpecial(before, 'leagues', [211])

	const summary = summariseChange(before, after, { action: 'remove', key: 'leagues', worlds: [211] })

	assert.match(summary.text, /3 → 2 worlds/)
})

test('a change to a disabled group says the member worlds are untouched', () => {
	const before = registry()
	const after = removeWorldsFromSpecial(before, 'leagues', [211])

	const summary = summariseChange(before, after, { action: 'remove', key: 'leagues', worlds: [211] })

	assert.match(summary.text, /disabled/i)
})

test('a change to an enabled group does not claim to be disabled', () => {
	const before = registry({
		specials: [{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [211, 212] }]
	})
	const after = removeWorldsFromSpecial(before, 'leagues', [211])

	const summary = summariseChange(before, after, { action: 'remove', key: 'leagues', worlds: [211] })

	assert.doesNotMatch(summary.text, /disabled/i)
})

test('enabling a group does not report a size change, since its worlds did not move', () => {
	const before = registry()
	const after = setSpecialEnabled(before, 'leagues', true)

	const summary = summariseChange(before, after, { action: 'enable', key: 'leagues' })

	assert.doesNotMatch(summary.text, /→ \d+ worlds/)
})
