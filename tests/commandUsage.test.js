import test from 'node:test'
import assert from 'node:assert/strict'

import { recordCommandUse, usageUpdate, GLOBALS_ID } from '../src/dsf/commandUsage.js'

const collector = () => {
	const calls = []
	return {
		calls,
		updateOne: async (filter, update, options) => {
			calls.push({ filter, update, options })
			return { matchedCount: 1, modifiedCount: 1 }
		}
	}
}

test('the update increments the command count', () => {
	const { update } = usageUpdate('lotto', new Date('2026-08-16T09:00:00Z'))

	assert.deepEqual(update.$inc, { 'commands.lotto': 1 })
})

test('the update records when the command was last used', () => {
	const when = new Date('2026-08-16T09:00:00Z')
	const { update } = usageUpdate('lotto', when)

	assert.deepEqual(update.$set, { 'commandsLastUsed.lotto': when })
})

test('the update targets the Globals document', () => {
	const { filter } = usageUpdate('lotto', new Date())

	assert.deepEqual(filter, { _id: GLOBALS_ID })
})

test('counting an unseen command creates it rather than needing a second write', async () => {
	// $inc creates a missing field, so the old two-step — update where the
	// field exists, then $set 1 when nothing matched — was never needed.
	const db = collector()

	await recordCommandUse(db, 'brandnew')

	assert.equal(db.calls.length, 1)
	assert.deepEqual(db.calls[0].update.$inc, { 'commands.brandnew': 1 })
})

test('a command name is stored as given', async () => {
	const db = collector()

	await recordCommandUse(db, 'worlds')

	assert.deepEqual(db.calls[0].update.$inc, { 'commands.worlds': 1 })
})

test('a name with a dot cannot reach into another field', async () => {
	// Mongo treats dots as a path separator, so an unchecked name could write
	// anywhere in the document. Command names never contain one.
	const db = collector()

	await recordCommandUse(db, 'evil.path')

	assert.equal(db.calls.length, 0)
})

test('a database failure does not reach the caller', async () => {
	// Counting usage must never take down the command that was just run.
	const db = {
		updateOne: async () => {
			throw new Error('mongo is down')
		}
	}

	await assert.doesNotReject(() => recordCommandUse(db, 'worlds'))
})
