import test from 'node:test'
import assert from 'node:assert/strict'

import { ScouterCheck } from '../src/classes.js'

// _checkScouts and _checkVerifiedScouts decide who appears in the weekly
// "potential scouters" embed. Neither touches `this`, so they can be exercised
// on a bare instance.
const checker = () => new ScouterCheck('Scouter', 1)

const MONTH = 1000 * 60 * 60 * 24 * 31

const profile = (overrides = {}) => ({
	count: 0,
	otherCount: 0,
	firstTimestamp: 0,
	lastTimestamp: MONTH,
	assigned: [],
	...overrides
})

test('someone over the count who has been around long enough qualifies', () => {
	const result = checker()._checkScouts(profile({ otherCount: 50 }), 10, MONTH)

	assert.notEqual(result, undefined)
})

test('someone under the count does not qualify', () => {
	assert.equal(checker()._checkScouts(profile({ otherCount: 5 }), 10, MONTH), undefined)
})

test('someone who has not been around long enough does not qualify', () => {
	const tooNew = profile({ otherCount: 50, lastTimestamp: MONTH / 2 })

	assert.equal(checker()._checkScouts(tooNew, 10, MONTH), undefined)
})

test('counts from every source add up', () => {
	// Discord calls, Alt1 calls, Alt1 first-reports and the frozen merchant
	// totals all count towards the threshold.
	const spread = profile({
		count: 2,
		otherCount: 2,
		alt1: { otherCount: 2, merchantCount: 2 },
		alt1First: { otherCount: 1, merchantCount: 1 }
	})

	assert.notEqual(checker()._checkScouts(spread, 10, MONTH), undefined)
	assert.equal(checker()._checkScouts(spread, 11, MONTH), undefined)
})

test('someone who already holds a scouter role is not a potential scouter', () => {
	const assigned = profile({ otherCount: 50, assigned: ['Scouter'] })

	assert.equal(checker()._checkScouts(assigned, 10, MONTH), undefined)
})

test('a profile with no assigned list is handled', () => {
	// Profiles are created with `assigned: []`, but older documents predate
	// that, and reading .length off undefined would throw inside the weekly
	// sweep rather than skipping one profile.
	const legacy = { count: 50, firstTimestamp: 0, lastTimestamp: MONTH }

	assert.doesNotThrow(() => checker()._checkScouts(legacy, 10, MONTH))
})

test('a verified scouter with one role qualifies', () => {
	const one = profile({ otherCount: 50, assigned: ['Scouter'] })

	assert.notEqual(checker()._checkVerifiedScouts(one, 10, MONTH), undefined)
})

test('someone with two roles is already verified and does not qualify', () => {
	const two = profile({ otherCount: 50, assigned: ['Scouter', 'Verified Scouter'] })

	assert.equal(checker()._checkVerifiedScouts(two, 10, MONTH), undefined)
})

test('someone with no roles is not a verified scouter candidate', () => {
	const none = profile({ otherCount: 50 })

	assert.equal(checker()._checkVerifiedScouts(none, 10, MONTH), undefined)
})

// Stripping the role on inactivity clears `assigned`, and an ex-scouter's counts
// are well past the threshold — so without this they come straight back as a
// "potential scouter" in the next weekly embed.
test('an inactive profile is not proposed for the scouter role', () => {
	const stripped = profile({ otherCount: 50, active: 0 })

	assert.equal(checker()._checkScouts(stripped, 10, MONTH), undefined)
})

test('an inactive profile is not proposed for the verified scouter role', () => {
	const stripped = profile({ otherCount: 50, assigned: ['Scouter'], active: 0 })

	assert.equal(checker()._checkVerifiedScouts(stripped, 10, MONTH), undefined)
})

// Only an explicit 0 excludes anyone: documents predating the flag have no
// `active` field, and they are not inactive.
test('a profile predating the active flag still qualifies', () => {
	const legacy = profile({ otherCount: 50 })

	assert.notEqual(checker()._checkScouts(legacy, 10, MONTH), undefined)
})

test('a profile missing its timestamps is skipped rather than crashing', () => {
	const undated = { count: 50, assigned: [] }

	assert.doesNotThrow(() => checker()._checkScouts(undated, 10, MONTH))
	assert.equal(checker()._checkScouts(undated, 10, MONTH), undefined)
})
