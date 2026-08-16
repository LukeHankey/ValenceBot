import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCallRegex, buildForeignWorldRegex, callRegexFor, foreignWorldRegexFor } from '../src/dsf/calls/callRegex.js'

const MEMBERS = [1, 2, 84, 143, 172, 173, 260]

test('a call on a member world passes', () => {
	assert.ok(buildCallRegex(MEMBERS).test('sm 172'))
})

test('a call on a league world added this season passes', () => {
	assert.ok(buildCallRegex(MEMBERS).test('sm 143'))
})

test('the event abbreviations still work', () => {
	const regex = buildCallRegex(MEMBERS)

	for (const call of ['wp 84', 'jf 84', 'wh 84', 'tt 84', 'ark 84', 'sea monster 84', 'whirlpool 84']) {
		assert.ok(regex.test(call), `${call} should pass`)
	}
})

test('a world that is not a member world does not pass', () => {
	assert.ok(!buildCallRegex(MEMBERS).test('sm 999'))
})

test('a world that only shares a prefix does not pass', () => {
	// 17 must not match because 172 is a member; the regex is anchored per world.
	assert.ok(!buildCallRegex(MEMBERS).test('sm 17'))
})

test('trailing notes after the world are allowed', () => {
	assert.ok(buildCallRegex(MEMBERS).test('sm 172 crashed'))
	assert.ok(buildCallRegex(MEMBERS).test('sm 172, 5 mins'))
})

test('a message that is not a call does not pass', () => {
	assert.ok(!buildCallRegex(MEMBERS).test('hello everyone'))
})

test('a bare world number is not a call', () => {
	assert.ok(!buildCallRegex(MEMBERS).test('172'))
})

test('the foreign regex matches a world that is not a member world', () => {
	assert.ok(buildForeignWorldRegex(MEMBERS).test('sm 299'))
})

test('the foreign regex does not match a member world', () => {
	assert.ok(!buildForeignWorldRegex(MEMBERS).test('sm 172'))
})

test('the foreign regex accepts the world prefix form', () => {
	assert.ok(buildForeignWorldRegex(MEMBERS).test('world 299'))
})

test('regexes are rebuilt when the member worlds change', () => {
	const before = buildCallRegex([84])
	const after = buildCallRegex([84, 172])

	assert.ok(!before.test('sm 172'))
	assert.ok(after.test('sm 172'))
})

test('the cached regexes rebuild when the registry version changes', () => {
	const v1 = { version: 1, baseWorlds: [84], specials: [] }
	const v2 = { version: 2, baseWorlds: [84], specials: [{ key: 'leagues', label: 'L', enabled: true, worlds: [172] }] }

	assert.ok(!callRegexFor(v1).test('sm 172'))
	assert.ok(callRegexFor(v2).test('sm 172'))
})

test('the same registry version reuses the cached regex', () => {
	const registry = { version: 5, baseWorlds: [84], specials: [] }

	assert.equal(callRegexFor(registry), callRegexFor(registry))
})

test('the foreign regex is cached the same way', () => {
	const registry = { version: 7, baseWorlds: [84], specials: [] }

	assert.equal(foreignWorldRegexFor(registry), foreignWorldRegexFor(registry))
})
