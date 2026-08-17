import test from 'node:test'
import assert from 'node:assert/strict'

import { setTimeout as delay } from 'node:timers/promises'

import { addedRoles, removedRoles, syncAssignedRoles } from '../src/dsf/scouts/scouters.js'

const checker = (roleName, members, roleId = 'role-1') => ({
	roleName,
	role: Promise.resolve({ id: roleId }),
	checkRolesAdded: async () => members,
	checkRolesRemoved: async () => members
})

const tracker = (profiles = {}) => {
	const writes = []
	return {
		writes,
		findOne: async ({ userID }) => profiles[userID] ?? null,
		updateOne: async (filter, update) => {
			writes.push({ filter, update })
			return { modifiedCount: 1 }
		}
	}
}

test('a newly assigned role is recorded against the profile', async () => {
	const db = tracker()

	await addedRoles(checker('Scouter', [{ id: '1' }]), db)

	assert.equal(db.writes.length, 1)
	assert.deepEqual(db.writes[0].update.$addToSet, { assigned: 'role-1' })
})

test('every member is written before the call resolves', async () => {
	// `members.map(async ...)` starts the writes without awaiting them, so the
	// function resolved while they were still in flight. Anything sequencing
	// work after it — or reading the profiles back — saw the old state.
	const db = tracker()

	await addedRoles(checker('Scouter', [{ id: '1' }, { id: '2' }, { id: '3' }]), db)

	assert.equal(db.writes.length, 3)
})

test('a removed role is pulled from the profile', async () => {
	const db = tracker()

	await removedRoles(checker('Scouter', [{ id: '1' }]), db)

	assert.deepEqual(db.writes[0].update.$pull, { assigned: 'role-1' })
})

test('every removal is written before the call resolves', async () => {
	const db = tracker()

	await removedRoles(checker('Scouter', [{ id: '1' }, { id: '2' }]), db)

	assert.equal(db.writes.length, 2)
})

test('becoming a Verified Scouter restores the counts held in oldScout', async () => {
	const db = tracker({
		1: {
			userID: '1',
			count: 5,
			otherCount: 2,
			oldScout: { count: 10, otherCount: 3, firstTimestamp: 100 }
		}
	})

	await addedRoles(checker('Verified Scouter', [{ id: '1' }]), db)

	const restore = db.writes.find((write) => write.update.$set)
	assert.equal(restore.update.$set.count, 15)
	assert.equal(restore.update.$set.otherCount, 5)
	assert.equal(restore.update.$set.firstTimestamp, 100)
	assert.deepEqual(restore.update.$unset, { oldScout: 1 })
})

// `[scout, vScout].forEach(async ...)` in the cron resolved immediately, so the
// work sequenced after it read the profiles while these writes were still in
// flight. Same bug as the one inside addedRoles (#264), one level up.
const slowChecker = (roleName, members, roleId) => ({
	roleName,
	role: Promise.resolve({ id: roleId }),
	checkRolesAdded: async () => {
		await delay(5)
		return members
	},
	checkRolesRemoved: async () => {
		await delay(5)
		return members
	}
})

test('every role is reconciled before the sweep resolves', async () => {
	const db = tracker()

	await syncAssignedRoles(
		[slowChecker('Scouter', [{ id: '1' }], 'role-1'), slowChecker('Verified Scouter', [{ id: '1' }], 'role-2')],
		db
	)

	// Two roles, each written once by addedRoles and once by removedRoles.
	assert.equal(db.writes.length, 4)
})

test('a role is fully reconciled before the next one starts', async () => {
	const db = tracker()

	await syncAssignedRoles(
		[slowChecker('Scouter', [{ id: '1' }], 'role-1'), slowChecker('Verified Scouter', [{ id: '1' }], 'role-2')],
		db
	)

	assert.deepEqual(
		db.writes.map((write) => write.update.$addToSet?.assigned ?? write.update.$pull?.assigned),
		['role-1', 'role-1', 'role-2', 'role-2']
	)
})

test('a profile with no oldScout is left alone', async () => {
	const db = tracker({ 1: { userID: '1', count: 5, otherCount: 2 } })

	await addedRoles(checker('Verified Scouter', [{ id: '1' }]), db)

	assert.equal(
		db.writes.every((write) => !write.update.$set),
		true
	)
})

test('a missing profile does not throw', async () => {
	// findOne returns null for someone with no profile, and reading .oldScout
	// off that is a TypeError inside an unawaited async callback — an unhandled
	// rejection rather than something the caller can catch.
	const db = tracker({})

	await assert.doesNotReject(() => addedRoles(checker('Verified Scouter', [{ id: 'nobody' }]), db))
})

test('missing counts never write NaN', async () => {
	// oldScout documents predate some of these fields. `undefined + number` is
	// NaN, and Mongo stores it, which poisons every later total and the
	// thresholds that read them.
	const db = tracker({ 1: { userID: '1', oldScout: { firstTimestamp: 100 } } })

	await addedRoles(checker('Verified Scouter', [{ id: '1' }]), db)

	const restore = db.writes.find((write) => write.update.$set)
	for (const [field, value] of Object.entries(restore?.update.$set ?? {})) {
		assert.equal(Number.isNaN(value), false, `${field} was written as NaN`)
	}
})
