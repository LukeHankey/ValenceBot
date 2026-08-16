import test from 'node:test'
import assert from 'node:assert/strict'

import { getWorldNumber } from '../src/dsf/calls/worlds.js'

test('reads the world from a call', () => {
	assert.equal(getWorldNumber('wp 84'), 84)
	assert.equal(getWorldNumber('sm 172'), 172)
	assert.equal(getWorldNumber('jf 5'), 5)
})

test('reads the world from a call carrying a time', () => {
	assert.equal(getWorldNumber('sm 172 1:30'), 172)
})

test('reads the world from the long form', () => {
	assert.equal(getWorldNumber('world 84'), 84)
	assert.equal(getWorldNumber('World 116'), 116)
})

test('reads the world from a webhook post', () => {
	assert.equal(getWorldNumber('JF105 (Called by 5Ftx) | Ends <t:1786886538:R>'), 105)
})

test('reports nothing for content with no number', () => {
	assert.equal(getWorldNumber('good morning'), null)
	assert.equal(getWorldNumber(''), null)
})

test('a world number longer than three digits is not a world', () => {
	// Worlds are 1-999. "sm 1720" is a typo, not world 172, and counting it as
	// one credits a call nobody made on a world nobody visited.
	assert.equal(getWorldNumber('sm 1720'), null)
})

test('the long form also refuses a number that is too long', () => {
	assert.equal(getWorldNumber('world 1720'), null)
})

test('the first number wins, which is the world in a call', () => {
	// Deliberate: this reads "2 people on wp 84" as world 2. Working out which
	// number is meant in a sentence is not this function's job — whether a
	// message is a call at all is decided by the regexes in callRegex.js, and
	// that message is not one, so it never reaches a count or a reaction.
	assert.equal(getWorldNumber('2 people on wp 84'), 2)
})

test('world 0 does not exist', () => {
	// Callers test falsiness, so returning 0 happened to behave like "no
	// world". Saying so outright means it survives someone using ?? or !==.
	assert.equal(getWorldNumber('sm 0'), null)
})

test('the highest world is read', () => {
	assert.equal(getWorldNumber('wp 999'), 999)
})
