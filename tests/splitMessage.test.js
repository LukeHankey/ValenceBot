import test from 'node:test'
import assert from 'node:assert/strict'

import { splitMessage, checkNum, capitalise } from '../src/functions.js'

test('a short message is left whole', () => {
	assert.deepEqual(splitMessage('hello'), ['hello'])
})

test('a long message is split on newlines', () => {
	const lines = Array.from({ length: 10 }, (_, i) => `line ${i}`.padEnd(20, '.'))
	const chunks = splitMessage(lines.join('\n'), { maxLength: 60 })

	assert.equal(chunks.length > 1, true)
	for (const chunk of chunks) assert.equal(chunk.length <= 60, true)
})

test('splitting keeps every line', () => {
	const lines = Array.from({ length: 20 }, (_, i) => `entry-${i}`)
	const chunks = splitMessage(lines.join('\n'), { maxLength: 40 })

	assert.deepEqual(chunks.join('\n').split('\n'), lines)
})

test('a single line longer than the limit is refused', () => {
	// The inactive-profile report builds lines from user-supplied display
	// names, so this is reachable: a long enough name throws where the caller
	// expects chunks.
	assert.throws(() => splitMessage('x'.repeat(200), { maxLength: 50 }), /SPLIT_MAX_LEN/)
})

test('an empty message produces no chunks', () => {
	assert.deepEqual(splitMessage(''), [''])
})

test('checkNum accepts a number in range', () => {
	assert.equal(checkNum(5, 1, 10), true)
	assert.equal(checkNum('5', 1, 10), true)
})

test('checkNum rejects a number out of range', () => {
	assert.equal(checkNum(0, 1, 10), false)
	assert.equal(checkNum(11, 1, 10), false)
})

test('checkNum rejects things that are not whole numbers', () => {
	assert.equal(checkNum('abc', 1, 10), false)
	assert.equal(checkNum('5abc', 1, 10), false)
	assert.equal(checkNum(5.5, 1, 10), false)
	assert.equal(checkNum('', 1, 10), false)
})

test('capitalise raises the first letter only', () => {
	assert.equal(capitalise('whirlpool'), 'Whirlpool')
	assert.equal(capitalise('sea monster'), 'Sea monster')
})

test('capitalise copes with an empty string', () => {
	assert.equal(capitalise(''), '')
})
