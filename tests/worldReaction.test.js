import test from 'node:test'
import assert from 'node:assert/strict'

import { reactionsForWorld } from '../src/dsf/calls/worlds.js'

const registry = (specials) => ({
	version: 1,
	baseWorlds: Array.from({ length: 60 }, (_, i) => i + 1),
	specials
})

test('a world in one enabled special gets that one emoji', () => {
	const emojis = reactionsForWorld(registry([{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] }]), 116)

	assert.equal(emojis.length, 1)
})

test('a world in several enabled specials gets one emoji per special', () => {
	const emojis = reactionsForWorld(
		registry([
			{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] },
			{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [116] }
		]),
		116
	)

	assert.equal(emojis.length, 2)
})

test('emoji order follows the specials array, not the lookup order', () => {
	const dsfFirst = reactionsForWorld(
		registry([
			{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] },
			{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [116] }
		]),
		116
	)
	const leaguesFirst = reactionsForWorld(
		registry([
			{ key: 'leagues', label: 'Leagues', enabled: true, worlds: [116] },
			{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] }
		]),
		116
	)

	assert.notDeepEqual(dsfFirst, leaguesFirst)
	assert.deepEqual(dsfFirst, [...leaguesFirst].reverse())
})

test('disabled specials contribute no emoji', () => {
	const emojis = reactionsForWorld(
		registry([
			{ key: 'leagues', label: 'Leagues', enabled: false, worlds: [116] },
			{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] }
		]),
		116
	)

	assert.equal(emojis.length, 1)
})

test('a special with no emoji mapped is skipped rather than reacted with nothing', () => {
	const emojis = reactionsForWorld(registry([{ key: 'brand_new_thing', label: 'New', enabled: true, worlds: [116] }]), 116)

	assert.deepEqual(emojis, [])
})

test('a world in no special gets no emoji', () => {
	const emojis = reactionsForWorld(registry([{ key: 'dsf', label: 'DSF', enabled: true, worlds: [116] }]), 5)

	assert.deepEqual(emojis, [])
})
