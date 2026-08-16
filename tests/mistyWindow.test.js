import test from 'node:test'
import assert from 'node:assert/strict'

import { parseDuration, buildWindow, describeWindow, CLIENT_FEATURES_DOCUMENT_ID } from '../src/dsf/calls/mistyWindow.js'

const NOW = new Date('2026-08-16T00:00:00Z')

test('parseDuration understands hours', () => {
	assert.equal(parseDuration('48h'), 48 * 60 * 60 * 1000)
})

test('parseDuration understands days', () => {
	assert.equal(parseDuration('3d'), 3 * 24 * 60 * 60 * 1000)
})

test('parseDuration understands minutes', () => {
	assert.equal(parseDuration('90m'), 90 * 60 * 1000)
})

test('parseDuration rejects nonsense', () => {
	assert.throws(() => parseDuration('soon'), /duration/i)
})

test('parseDuration rejects zero and negatives', () => {
	assert.throws(() => parseDuration('0h'), /duration/i)
	assert.throws(() => parseDuration('-2h'), /duration/i)
})

test('parseDuration rejects a window longer than a month', () => {
	assert.throws(() => parseDuration('60d'), /longer than/i)
})

test('buildWindow sets an end from the duration', () => {
	const window = buildWindow({ duration: '48h', reason: 'DXP', userId: '1', now: NOW })

	assert.equal(window.open, true)
	assert.equal(window.until.toISOString(), '2026-08-18T00:00:00.000Z')
	assert.equal(window.reason, 'DXP')
	assert.equal(window.setBy, '1')
})

test('buildWindow without a duration stays open until closed by hand', () => {
	const window = buildWindow({ userId: '1', now: NOW })

	assert.equal(window.open, true)
	assert.equal(window.until, null)
})

test('closing produces a closed window', () => {
	const window = buildWindow({ close: true, userId: '1', now: NOW })

	assert.equal(window.open, false)
})

test('describeWindow reports a timed window with a Discord timestamp', () => {
	const text = describeWindow(buildWindow({ duration: '48h', reason: 'DXP', userId: '1', now: NOW }))

	assert.match(text, /open/i)
	assert.match(text, /<t:\d+:[Rf]>/)
	assert.match(text, /DXP/)
})

test('describeWindow reports an open-ended window', () => {
	const text = describeWindow(buildWindow({ userId: '1', now: NOW }))

	assert.match(text, /until it is closed/i)
})

test('describeWindow reports a closed window', () => {
	assert.match(describeWindow(buildWindow({ close: true, userId: '1', now: NOW })), /closed/i)
})

test('describeWindow reports an expired window as closed', () => {
	const expired = { open: true, until: new Date('2020-01-01T00:00:00Z'), reason: null }

	assert.match(describeWindow(expired), /closed|expired/i)
})

test('the document id matches what the server watches', () => {
	assert.equal(CLIENT_FEATURES_DOCUMENT_ID, 'ClientFeatures')
})
