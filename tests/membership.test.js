import test from 'node:test'
import assert from 'node:assert/strict'

import {
	chunkIds,
	partitionByMembership,
	markDepartedInactive,
	selectInactiveProfiles,
	buildInactiveReport,
	planReportDelivery,
	splitReportAudience
} from '../src/dsf/scouts/membership.js'

const guildWith = (presentIds) => ({
	members: {
		fetch: async ({ user }) => {
			const found = user.filter((id) => presentIds.includes(id))
			return new Map(found.map((id) => [id, { id }]))
		}
	}
})

test('chunkIds splits into batches of the requested size', () => {
	assert.deepEqual(chunkIds(['1', '2', '3', '4', '5'], 2), [['1', '2'], ['3', '4'], ['5']])
})

test('chunkIds returns nothing for an empty list', () => {
	assert.deepEqual(chunkIds([], 100), [])
})

test('chunkIds keeps a short list in one batch', () => {
	assert.deepEqual(chunkIds(['1', '2'], 100), [['1', '2']])
})

test('partitionByMembership separates present from departed', async () => {
	const { present, departed } = await partitionByMembership(guildWith(['1', '3']), ['1', '2', '3'])

	assert.deepEqual([...present].sort(), ['1', '3'])
	assert.deepEqual(departed, ['2'])
})

test('everyone departed when the guild has none of them', async () => {
	const { present, departed } = await partitionByMembership(guildWith([]), ['1', '2'])

	assert.equal(present.size, 0)
	assert.deepEqual(departed, ['1', '2'])
})

test('nobody departed when all are present', async () => {
	const { departed } = await partitionByMembership(guildWith(['1', '2']), ['1', '2'])

	assert.deepEqual(departed, [])
})

test('handles an empty id list without calling Discord', async () => {
	let called = false
	const guild = {
		members: {
			fetch: async () => {
				called = true
				return new Map()
			}
		}
	}

	const { present, departed } = await partitionByMembership(guild, [])

	assert.equal(called, false)
	assert.equal(present.size, 0)
	assert.deepEqual(departed, [])
})

test('batches large id lists so Discord is not asked for more than 100 at once', async () => {
	const seen = []
	const guild = {
		members: {
			fetch: async ({ user }) => {
				seen.push(user.length)
				return new Map()
			}
		}
	}

	await partitionByMembership(
		guild,
		Array.from({ length: 250 }, (_, i) => String(i))
	)

	assert.deepEqual(seen, [100, 100, 50])
})

test('a failed batch is treated as unknown rather than departed', async () => {
	const guild = {
		members: {
			fetch: async () => {
				throw new Error('rate limited')
			}
		}
	}

	const { departed } = await partitionByMembership(guild, ['1', '2'])

	// Nobody is marked departed on an error: that would wrongly deactivate profiles.
	assert.deepEqual(departed, [])
})

test('markDepartedInactive sets active to 0 for departed users only', async () => {
	const calls = []
	const collection = {
		updateMany: async (filter, update) => {
			calls.push({ filter, update })
			return { modifiedCount: filter.userID.$in.length }
		}
	}

	const modified = await markDepartedInactive(collection, ['1', '2'])

	assert.deepEqual(calls[0].filter.userID.$in, ['1', '2'])
	assert.equal(calls[0].update.$set.active, 0)
	assert.equal(modified, 2)
})

test('markDepartedInactive records when they were found to have left', async () => {
	const calls = []
	const collection = {
		updateMany: async (filter, update) => {
			calls.push(update)
			return { modifiedCount: 1 }
		}
	}

	await markDepartedInactive(collection, ['1'])

	assert.ok(calls[0].$set.leftAt instanceof Date)
})

test('markDepartedInactive only touches profiles still marked active', async () => {
	const calls = []
	const collection = {
		updateMany: async (filter) => {
			calls.push(filter)
			return { modifiedCount: 0 }
		}
	}

	await markDepartedInactive(collection, ['1'])

	assert.equal(calls[0].active, 1)
})

test('markDepartedInactive does nothing when nobody departed', async () => {
	let called = false
	const collection = {
		updateMany: async () => {
			called = true
			return { modifiedCount: 0 }
		}
	}

	const modified = await markDepartedInactive(collection, [])

	assert.equal(called, false)
	assert.equal(modified, 0)
})

// --- inactivity sweep -------------------------------------------------------

const DAY = 1000 * 60 * 60 * 24
const NOW = 1_800_000_000_000

const profile = (over = {}) => ({
	userID: '1',
	author: 'someone',
	count: 0,
	otherCount: 0,
	assigned: [],
	active: 1,
	lastTimestamp: NOW,
	...over
})

test('a quiet low-count profile is marked inactive after 31 days', () => {
	const selected = selectInactiveProfiles([profile({ otherCount: 5, lastTimestamp: NOW - 32 * DAY })], NOW)

	assert.equal(selected.length, 1)
})

test('a quiet low-count profile is left alone before 31 days', () => {
	const selected = selectInactiveProfiles([profile({ otherCount: 5, lastTimestamp: NOW - 20 * DAY })], NOW)

	assert.deepEqual(selected, [])
})

test('a busy profile is not caught by the 31 day rule', () => {
	const selected = selectInactiveProfiles([profile({ otherCount: 50, lastTimestamp: NOW - 40 * DAY })], NOW)

	assert.deepEqual(selected, [])
})

test('a scouter is marked inactive after three months', () => {
	const selected = selectInactiveProfiles(
		[profile({ otherCount: 500, assigned: ['role1'], lastTimestamp: NOW - 100 * DAY })],
		NOW
	)

	assert.equal(selected.length, 1)
})

test('a scouter quiet for only two months is left alone', () => {
	const selected = selectInactiveProfiles(
		[profile({ otherCount: 500, assigned: ['role1'], lastTimestamp: NOW - 60 * DAY })],
		NOW
	)

	assert.deepEqual(selected, [])
})

test('profiles already inactive are not selected again', () => {
	const selected = selectInactiveProfiles([profile({ active: 0, otherCount: 1, lastTimestamp: NOW - 400 * DAY })], NOW)

	assert.deepEqual(selected, [])
})

test('the counted total includes alt1 counts', () => {
	const busyViaAlt1 = profile({ alt1: { otherCount: 20 }, lastTimestamp: NOW - 40 * DAY })

	assert.deepEqual(selectInactiveProfiles([busyViaAlt1], NOW), [])
})

test('the report says why each profile was marked', () => {
	const lines = buildInactiveReport([{ author: 'a', userID: '1', reason: 'left the server' }])

	assert.match(lines[0], /left the server/)
	assert.match(lines[0], /a/)
})

test('the report splits into chunks under the Discord message limit', () => {
	const many = Array.from({ length: 400 }, (_, i) => ({
		author: `scouter-with-a-long-name-${i}`,
		userID: String(100000000000000000 + i),
		reason: 'no activity for 31 days'
	}))

	const chunks = buildInactiveReport(many)

	assert.ok(chunks.length > 1)
	for (const chunk of chunks) assert.ok(chunk.length <= 2000, `chunk was ${chunk.length}`)
})

test('the report is empty when nothing changed', () => {
	assert.deepEqual(buildInactiveReport([]), [])
})

test('a small report is sent as chunked messages', () => {
	const plan = planReportDelivery(['line one', 'line two'])

	assert.equal(plan.mode, 'messages')
	assert.equal(plan.chunks.length, 2)
})

test('a large report is sent as a single file instead of many messages', () => {
	const plan = planReportDelivery(Array.from({ length: 55 }, (_, i) => `chunk ${i}`))

	assert.equal(plan.mode, 'file')
	assert.ok(plan.content.includes('chunk 54'))
})

test('the file plan keeps every line', () => {
	const chunks = Array.from({ length: 20 }, (_, i) => `chunk ${i}`)
	const plan = planReportDelivery(chunks)

	for (const chunk of chunks) assert.ok(plan.content.includes(chunk))
})

test('nothing to report means nothing to send', () => {
	assert.equal(planReportDelivery([]).mode, 'none')
})

test('scouters are reported separately from everyone else', () => {
	const { owners, general } = splitReportAudience([
		{ author: 'a', userID: '1', reason: 'left the server', isScouter: true },
		{ author: 'b', userID: '2', reason: 'left the server', isScouter: false }
	])

	assert.equal(owners.length, 1)
	assert.equal(owners[0].userID, '1')
	assert.equal(general.length, 1)
	assert.equal(general[0].userID, '2')
})

test('no scouters means nothing for the owners channel', () => {
	const { owners, general } = splitReportAudience([{ author: 'b', userID: '2', reason: 'quiet', isScouter: false }])

	assert.deepEqual(owners, [])
	assert.equal(general.length, 1)
})

test('entries without the flag are treated as general', () => {
	const { owners, general } = splitReportAudience([{ author: 'b', userID: '2', reason: 'quiet' }])

	assert.deepEqual(owners, [])
	assert.equal(general.length, 1)
})

// A production sweep logged "Members didn't arrive in time." for a batch of
// 100. Discord times the request out under load; the whole batch was then
// written off as unknown, so those profiles went unchecked for six hours.
const flakyGuild = (presentIds, { failFirstBatchesOfSize = 100 } = {}) => {
	const attempts = []
	return {
		attempts,
		members: {
			fetch: async ({ user }) => {
				attempts.push(user.length)
				if (user.length >= failFirstBatchesOfSize) {
					const error = new Error("Members didn't arrive in time.")
					throw error
				}
				const found = user.filter((id) => presentIds.includes(id))
				return new Map(found.map((id) => [id, { id }]))
			}
		}
	}
}

test('a timed-out batch is retried in smaller pieces', async () => {
	const ids = Array.from({ length: 100 }, (_, i) => String(i))
	const guild = flakyGuild(ids.filter((id) => Number(id) % 2 === 0))

	const { present, departed } = await partitionByMembership(guild, ids)

	// The batch of 100 fails, then the halves succeed.
	assert.equal(guild.attempts[0], 100)
	assert.equal(guild.attempts.length > 1, true)
	assert.equal(present.size, 50)
	assert.equal(departed.length, 50)
})

test('a batch that fails however small it gets is left unknown', async () => {
	const guild = flakyGuild(['1'], { failFirstBatchesOfSize: 1 })

	const { present, departed } = await partitionByMembership(guild, ['1', '2'])

	assert.equal(present.size, 0)
	assert.deepEqual(departed, [])
})
