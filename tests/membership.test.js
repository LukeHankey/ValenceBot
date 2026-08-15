import test from 'node:test'
import assert from 'node:assert/strict'

import { chunkIds, partitionByMembership, markDepartedInactive } from '../src/dsf/scouts/membership.js'

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
