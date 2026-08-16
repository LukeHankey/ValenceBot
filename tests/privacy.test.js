import test from 'node:test'
import assert from 'node:assert/strict'

import { isOptedOut, setOptOut, OPT_OUT_FIELD } from '../src/dsf/privacy.js'

const collection = (profile = null) => {
	const calls = []
	return {
		calls,
		findOne: async (filter, options) => {
			calls.push({ op: 'findOne', filter, options })
			return profile
		},
		updateOne: async (filter, update, options) => {
			calls.push({ op: 'updateOne', filter, update, options })
			return { matchedCount: 1, upsertedCount: 0 }
		}
	}
}

test('a user with no profile is not opted out', async () => {
	assert.equal(await isOptedOut(collection(null), '1'), false)
})

test('a user with a profile and no flag is not opted out', async () => {
	assert.equal(await isOptedOut(collection({ userID: '1' }), '1'), false)
})

test('a user who opted out is reported as opted out', async () => {
	assert.equal(await isOptedOut(collection({ userID: '1', [OPT_OUT_FIELD]: true }), '1'), true)
})

test('a user who opted back in is not opted out', async () => {
	assert.equal(await isOptedOut(collection({ userID: '1', [OPT_OUT_FIELD]: false }), '1'), false)
})

test('a database failure leaves the user opted out', async () => {
	// The safe direction: if we cannot tell, do not read or store their data.
	const failing = {
		findOne: async () => {
			throw new Error('mongo is down')
		}
	}

	assert.equal(await isOptedOut(failing, '1'), true)
})

test('opting out records the choice against the user', async () => {
	const db = collection()

	await setOptOut(db, '1', true)

	const [write] = db.calls.filter((call) => call.op === 'updateOne')
	assert.deepEqual(write.filter, { userID: '1' })
	assert.equal(write.update.$set[OPT_OUT_FIELD], true)
})

test('opting out creates a record for someone who never reported an event', async () => {
	// Someone can opt out before they have ever called, so there may be no
	// profile to set the flag on.
	const db = collection()

	await setOptOut(db, '1', true)

	const [write] = db.calls.filter((call) => call.op === 'updateOne')
	assert.equal(write.options.upsert, true)
})

test('opting back in clears the flag rather than leaving it false', async () => {
	const db = collection()

	await setOptOut(db, '1', false)

	const [write] = db.calls.filter((call) => call.op === 'updateOne')
	assert.equal(OPT_OUT_FIELD in (write.update.$unset ?? {}), true)
})
