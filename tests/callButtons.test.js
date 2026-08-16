import test from 'node:test'
import assert from 'node:assert/strict'

import { buttonFunctions } from '../src/dsf/calls/callCount.js'
import { buildForeignWorldRegex } from '../src/dsf/calls/callRegex.js'

const member = { user: { username: 'someone' } }

// Member worlds for these tests: everything else counts as foreign.
const foreignRegex = buildForeignWorldRegex(['84', '116', '172'])

const rows = (content, regex = foreignRegex) => buttonFunctions(member, content, regex)

test('every row is built for an ordinary call', () => {
	const [selection, extra, foreign, already] = rows('wp 84')

	for (const row of [selection, extra, foreign, already]) assert.notEqual(row, undefined)
})

test('the DM button is labelled with the caller', () => {
	const [selection] = rows('wp 84')

	assert.equal(selection.components[0].data.label, 'DM someone')
})

test('a foreign world with a known flag gets that flag', () => {
	// World 102 is one of the German worlds.
	const [, , foreign] = rows('w 102')

	assert.equal(foreign.components[0].data.emoji.name, '🇩🇪')
})

test('a foreign world with no flag still builds a button', () => {
	// Most foreign worlds are in none of the flag lists. The emoji lookup
	// returns undefined for those, and a button cannot carry an undefined
	// emoji name — this used to throw while building the spam report, which
	// happens for every message that is not a valid call.
	assert.doesNotThrow(() => rows('w 3'))
})

test('a call that is not a foreign world still builds its buttons', () => {
	assert.doesNotThrow(() => rows('wp 84'))
})

test('no foreign regex at all is tolerated', () => {
	assert.doesNotThrow(() => buttonFunctions(member, 'wp 84', null))
})

test('a single-digit foreign world is read correctly', () => {
	// The extraction used \d{2,3}, which cannot match a one-digit world.
	assert.doesNotThrow(() => rows('w 7'))
})

test('a world with no flag carries no emoji at all', () => {
	// Not the same as an empty emoji: `setEmoji({ name: undefined })`
	// serialised as `emoji: {}`, which Discord rejects, so the spam report for
	// a call on any world outside the three flag lists could not be sent.
	const [, , foreign] = rows('w 3')

	assert.equal(foreign.components[0].toJSON().emoji, undefined)
})

test('each flag list is matched', () => {
	const flagFor = (content) => rows(content)[2].components[0].toJSON().emoji?.name

	assert.equal(flagFor('w 102'), '🇩🇪')
	assert.equal(flagFor('w 299'), '🇫🇷')
	assert.equal(flagFor('w 47'), '🇧🇷')
})

test('the clear button is still offered alongside', () => {
	const [, , foreign] = rows('w 3')

	assert.equal(foreign.components[1].data.custom_id, 'Clear Buttons')
})
