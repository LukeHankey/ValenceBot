import test from 'node:test'
import assert from 'node:assert/strict'

import dsf from '../src/dsf/calls/main.js'

// Without the MessageContent intent, Discord delivers other people's messages
// (webhooks included) with empty content. That says nothing about whether the
// call was valid, so it must not be deleted as one with no world number.
test('a call whose content the bot cannot read is left alone', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	const deleted = []
	const client = {
		logger: { info() {}, error() {} },
		database: {
			settings: { findOne: async () => ({ eventChannel: { otherChannelID: 'calls', otherMessages: [] } }) },
			channels: Promise.resolve({ errors: { send() {} } }),
			scoutTracker: { findOne: async () => null }
		}
	}
	const message = {
		content: '',
		guild: { id: 'g' },
		channel: { id: 'calls' },
		author: { id: 'u', username: 'someone', bot: false },
		delete: () => deleted.push(true)
	}

	await dsf(client, message)
	t.mock.timers.runAll()

	assert.equal(deleted.length, 0)
})
