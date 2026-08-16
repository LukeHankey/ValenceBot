import test from 'node:test'
import assert from 'node:assert/strict'

import { messageInArray, worldAlreadyCalled } from '../src/dsf/calls/callFilters.js'

const called = (content) => ({ content })

test('messageInArray finds a disallowed word', () => {
	assert.equal(messageInArray('wp 84 dead', ['dead', 'gone']), true)
})

test('messageInArray reports no match', () => {
	assert.equal(messageInArray('wp 84', ['dead']), false)
})

test('messageInArray treats missing settings as nothing disallowed', () => {
	// `disallowedWords` is optional in the guild settings document, so the
	// projection returns undefined for a guild that has never set one. Reading
	// .some() off that threw for every call message in such a guild.
	assert.equal(messageInArray('wp 84', undefined), false)
	assert.equal(messageInArray('wp 84', null), false)
})

test('worldAlreadyCalled spots a world already in the list', () => {
	assert.equal(worldAlreadyCalled(called('wp 84'), [called('wp 84')]), true)
})

test('worldAlreadyCalled allows a world that is not in the list', () => {
	assert.equal(worldAlreadyCalled(called('wp 84'), [called('sm 172')]), false)
})

test('worldAlreadyCalled handles an empty list', () => {
	assert.equal(worldAlreadyCalled(called('wp 84'), []), false)
})

test('worldAlreadyCalled does not match two messages that both lack a world', () => {
	// getWorldNumber returns null rather than throwing, so a message with no
	// number compared against a stored message with no number matched on
	// null === null and reported the call as already made.
	assert.equal(worldAlreadyCalled(called('hello'), [called('good morning')]), false)
})

test('worldAlreadyCalled ignores a stored message with no world', () => {
	assert.equal(worldAlreadyCalled(called('wp 84'), [called('good morning'), called('wp 84')]), true)
})

test('worldAlreadyCalled treats a missing message list as nothing called', () => {
	assert.equal(worldAlreadyCalled(called('wp 84'), undefined), false)
})
