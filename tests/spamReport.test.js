import test from 'node:test'
import assert from 'node:assert/strict'

import { buildSpamReport } from '../src/dsf/calls/spamReport.js'

const report = (overrides = {}) =>
	buildSpamReport({
		messageId: '111',
		userId: '222',
		username: 'someone',
		content: 'wp 84 asdf',
		timestamp: 'Sat Aug 16 2026 09:00',
		channelName: 'other',
		hasPostedBefore: true,
		...overrides
	})

test('the report names the message, user and content', () => {
	const content = report()

	assert.match(content, /Spam Message 111/)
	assert.match(content, /<@!222>/)
	assert.match(content, /someone/)
	assert.match(content, /wp 84 asdf/)
})

test('the report says whether the caller has posted before', () => {
	assert.match(report({ hasPostedBefore: true }), /User has posted before/)
	assert.match(report({ hasPostedBefore: false }), /User has not posted before/)
})

test('the report survives a channel that is not in the cache', () => {
	// callChannel comes from client.channels.cache.get(otherChannelID), which
	// returns undefined when the channel is uncached, deleted, or the guild has
	// no event channel set. Reading .name off it threw before anything was
	// reported, and the throw took the whole call handler with it.
	const content = report({ channelName: undefined })

	assert.match(content, /Channel: unknown/)
	assert.match(content, /Spam Message 111/)
})

test('the report is a diff block Discord will colour', () => {
	const content = report()

	assert.equal(content.startsWith('```diff\n'), true)
	assert.equal(content.endsWith('```'), true)
})
