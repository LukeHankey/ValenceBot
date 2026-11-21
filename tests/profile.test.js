import test from 'node:test'
import assert from 'node:assert/strict'

import profile, { leaderboardFields } from '../src/commands/profile.js'

const p = (author, count) => ({
	author,
	count,
	otherCount: 2,
	firstTimestamp: 0,
	lastTimestamp: 60_000,
	lastTimestampReadable: new Date('2026-11-01T12:00:00Z')
})

test('leaderboard fields show time active by default, and last activity when asked', () => {
	const [active] = leaderboardFields([p('Ann', 20)])
	assert.equal(active.name, 'Ann')
	assert.match(active.value, /Merch count: 20\nOther count: 2\nActive for: 1m/)

	const [inactive] = leaderboardFields([p('Ann', 20)], { lastActive: true })
	assert.match(inactive.value, /Last Active: Nov 01 2026/)
})

test('leaderboard fields are capped at 100', () => {
	assert.equal(leaderboardFields(Array.from({ length: 150 }, (_, i) => p(`m${i}`, i))).length, 100)
})

test('every slash subcommand has a usage and description entry', () => {
	const subs = profile.data.toJSON().options.map((o) => o.name)
	assert.deepEqual(subs, ['view', 'role', 'create', 'all', 'active', 'inactive', 'raffle'])
	assert.deepEqual(
		profile.usage.map((u) => u.split(' ')[0]),
		subs
	)
	assert.equal(profile.description.length, subs.length)
	assert.equal(profile.run, undefined)
})
