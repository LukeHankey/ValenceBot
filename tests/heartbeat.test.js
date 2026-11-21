import test from 'node:test'
import assert from 'node:assert/strict'
import { Collection, Status } from 'discord.js'

import { isStale, LIMIT_MS } from '../src/heartbeat.js'

const clientWith = (...statuses) => ({
	ws: { shards: new Collection(statuses.map((status, id) => [id, { status }])) }
})

test('a gateway that is not Ready goes stale only after the limit, and Ready resets it', () => {
	const state = { since: null }
	const down = clientWith(Status.Reconnecting)

	assert.equal(isStale(down, state, 0), false)
	assert.equal(isStale(down, state, LIMIT_MS - 1), false)
	assert.equal(isStale(clientWith(Status.Ready), state, LIMIT_MS - 1), false)
	assert.equal(state.since, null)
	assert.equal(isStale(down, state, LIMIT_MS), false)
	assert.equal(isStale(down, state, 2 * LIMIT_MS), true)
})

test('no shards yet (never logged in) counts as not Ready', () => {
	const state = { since: null }
	assert.equal(isStale(clientWith(), state, 0), false)
	assert.equal(isStale(clientWith(), state, LIMIT_MS), true)
})

test('one shard down is enough', () => {
	const state = { since: 0 }
	assert.equal(isStale(clientWith(Status.Ready, Status.Idle), state, LIMIT_MS), true)
})
