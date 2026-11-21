import test from 'node:test'
import assert from 'node:assert/strict'

import shardDisconnect from '../src/events/client/shardDisconnect.js'

test('an unrecoverable gateway close logs the code by name and exits non-zero', (t) => {
	const exit = t.mock.method(process, 'exit', () => {})
	const errors = []
	const client = { logger: { error: (message) => errors.push(message) } }

	shardDisconnect(client, { code: 4014, reason: 'deprecated', wasClean: true }, 0)

	assert.deepEqual(exit.mock.calls[0].arguments, [1])
	assert.match(errors[0], /shard 0 closed with 4014 \(DisallowedIntents\)/)
})
