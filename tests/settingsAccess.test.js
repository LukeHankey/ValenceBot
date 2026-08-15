import test from 'node:test'
import assert from 'node:assert/strict'

import { getEventChannel } from '../src/dsf/calls/settingsAccess.js'

const collection = (document) => ({ findOne: async () => document })

test('returns the channel fields when the document is complete', async () => {
	const result = await getEventChannel(
		collection({ eventChannel: { otherChannelID: '123', otherMessages: [{ messageID: '1' }] } }),
		'420803245758480405'
	)

	assert.equal(result.otherChannelID, '123')
	assert.equal(result.otherMessages.length, 1)
})

test('returns empty defaults when the document is missing', async () => {
	const result = await getEventChannel(collection(null), '420803245758480405')

	assert.equal(result.otherChannelID, null)
	assert.deepEqual(result.otherMessages, [])
})

test('returns empty defaults when eventChannel is absent', async () => {
	const result = await getEventChannel(collection({ _id: 'x' }), '420803245758480405')

	assert.equal(result.otherChannelID, null)
	assert.deepEqual(result.otherMessages, [])
})

test('does not throw when the document is missing', async () => {
	await assert.doesNotReject(() => getEventChannel(collection(null), 'x'))
})

test('does not throw when eventChannel is absent', async () => {
	await assert.doesNotReject(() => getEventChannel(collection({ _id: 'x' }), 'x'))
})

test('survives the database call failing', async () => {
	const failing = {
		findOne: async () => {
			throw new Error('mongo is down')
		}
	}

	const result = await getEventChannel(failing, 'x')

	assert.equal(result.otherChannelID, null)
	assert.deepEqual(result.otherMessages, [])
})

test('reports whether the settings were found, so callers can skip work', async () => {
	const found = await getEventChannel(collection({ eventChannel: { otherChannelID: '1', otherMessages: [] } }), 'x')
	const missing = await getEventChannel(collection(null), 'x')

	assert.equal(found.found, true)
	assert.equal(missing.found, false)
})

test('defaults otherMessages when only the channel id is stored', async () => {
	const result = await getEventChannel(collection({ eventChannel: { otherChannelID: '123' } }), 'x')

	assert.equal(result.otherChannelID, '123')
	assert.deepEqual(result.otherMessages, [])
})

test('queries the guild it was asked for', async () => {
	let seen
	const spy = {
		findOne: async (query) => {
			seen = query
			return { eventChannel: {} }
		}
	}

	await getEventChannel(spy, '668330890790699079')

	assert.equal(seen._id, '668330890790699079')
})
