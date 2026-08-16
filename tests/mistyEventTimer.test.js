import test from 'node:test'
import assert from 'node:assert/strict'

import { mistyEventTimer } from '../src/dsf/calls/skullTimer.js'
import { TEN_MINUTES } from '../src/dsf/calls/constants.js'

test('a call with no time left gets the full event duration', () => {
	assert.equal(mistyEventTimer('wp 84'), TEN_MINUTES / 2)
})

test('a call with a time remaining has it taken off the duration', () => {
	// "1:30" of the whirlpool's five minutes has already gone.
	assert.equal(mistyEventTimer('wp 84 1:30'), TEN_MINUTES / 2 - 90_000)
})

test('each event type gets its own duration', () => {
	assert.equal(mistyEventTimer('sm 172'), TEN_MINUTES / 5)
	assert.equal(mistyEventTimer('tt 84'), TEN_MINUTES / 2)
	assert.equal(mistyEventTimer('ark 99'), 39_000)
})

test('content that is not a call returns null rather than throwing', () => {
	// The webhook posts as "Jellyfish - World 84 | <t:...:R>", which does not
	// match the call format. Object.entries(undefined) threw, and the throw
	// escaped dsf() and aborted handling the message.
	assert.equal(mistyEventTimer('Jellyfish - World 84 | ends soon'), null)
	assert.equal(mistyEventTimer('good morning'), null)
	assert.equal(mistyEventTimer(''), null)
})

test('a timer already past its duration comes back at zero, not negative', () => {
	// A negative duration is rejected by startEventTimer, so the event would
	// never be skulled. Zero ends it immediately, which is what is meant.
	assert.equal(mistyEventTimer('sm 172 5:00'), 0)
})
