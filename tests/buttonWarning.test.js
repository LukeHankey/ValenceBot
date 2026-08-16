import test from 'node:test'
import assert from 'node:assert/strict'

import { ButtonWarning } from '../src/handlers/interactions/buttons.js'

const interaction = (customId) => ({ customId, message: { createdTimestamp: 0 }, guild: { members: {} } })

const trackerWith = (profile) => {
	const writes = []
	return {
		writes,
		findOne: async () => profile,
		findOneAndUpdate: async (filter, update) => {
			writes.push(update)
			return profile
		}
	}
}

const loggerFor = (customId, profile = { userID: '1', buttons: {} }) => {
	const warning = new ButtonWarning(interaction(customId))
	warning.scouters = trackerWith(profile)
	return warning
}

test('a button name becomes a camel case field', () => {
	assert.equal(new ButtonWarning(interaction('Read The Pins')).buttonName, 'readThePins')
	assert.equal(new ButtonWarning(interaction('Eyes on Call Channels')).buttonName, 'eyesOnCallChannels')
})

test('a DM button is recorded as password', () => {
	assert.equal(new ButtonWarning(interaction('DM someone')).buttonName, 'password')
})

test('pressing Foreign World logs nothing', async () => {
	// UNLOGGED_NAMES is an array, and the guard used `in`, which tests indices
	// rather than values — so it never fired and the press was counted anyway.
	// 13 production profiles carry a foreignWorld count as a result.
	const warning = loggerFor('Foreign World')

	await warning.addCount('1')

	assert.deepEqual(warning.scouters.writes, [])
})

test('pressing Clear Buttons logs nothing', async () => {
	const warning = loggerFor('Clear Buttons')

	await warning.addCount('1')

	assert.deepEqual(warning.scouters.writes, [])
})

test('a logged button is counted', async () => {
	const warning = loggerFor('Read The Pins')

	const name = await warning.addCount('1')

	assert.equal(name, 'readThePins')
	assert.equal(warning.scouters.writes.length, 1)
})

test('the first press of a button sets it to one', async () => {
	const warning = loggerFor('Read The Pins', { userID: '1' })

	await warning.addCount('1')

	assert.deepEqual(warning.scouters.writes[0], { $set: { 'buttons.readThePins': 1 } })
})

test('a later press increments it', async () => {
	const warning = loggerFor('Read The Pins', { userID: '1', buttons: { readThePins: 4 } })

	await warning.addCount('1')

	assert.deepEqual(warning.scouters.writes[0], { $inc: { 'buttons.readThePins': 1 } })
})

test('a warning keeps the whole call, colons and all', () => {
	// Calls carry times: "sm 172 1:30". Splitting on ":" and taking one field
	// stored that as "sm 172 1", losing the seconds from the record of what
	// someone actually said.
	const warning = loggerFor('Timeout')

	const processed = warning._preprocess({ content: 'Content: sm 172 1:30' })

	assert.equal(processed.content, 'sm 172 1:30')
})

test('a warning without a colon in the content does not throw', () => {
	const warning = loggerFor('Timeout')

	assert.doesNotThrow(() => warning._preprocess({ content: 'no colon here' }))
})

test('other fields keep everything after the first separator', () => {
	const warning = loggerFor('Timeout')

	const processed = warning._preprocess({ reason: 'Reason: spam: repeated' })

	assert.equal(processed.reason, 'spam: repeated')
})
