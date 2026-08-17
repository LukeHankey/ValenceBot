import test from 'node:test'
import assert from 'node:assert/strict'

import {
	chunkIds,
	partitionByMembership,
	markDepartedInactive,
	selectInactiveProfiles,
	buildInactiveReport,
	planReportDelivery,
	splitReportAudience,
	selectStrippable,
	strippableRoles,
	stripInactiveRoles
} from '../src/dsf/scouts/membership.js'

const guildWith = (presentIds) => ({
	members: {
		fetch: async ({ user }) => {
			const found = user.filter((id) => presentIds.includes(id))
			return new Map(found.map((id) => [id, { id }]))
		}
	}
})

test('chunkIds splits into batches of the requested size', () => {
	assert.deepEqual(chunkIds(['1', '2', '3', '4', '5'], 2), [['1', '2'], ['3', '4'], ['5']])
})

test('chunkIds returns nothing for an empty list', () => {
	assert.deepEqual(chunkIds([], 100), [])
})

test('chunkIds keeps a short list in one batch', () => {
	assert.deepEqual(chunkIds(['1', '2'], 100), [['1', '2']])
})

test('partitionByMembership separates present from departed', async () => {
	const { present, departed } = await partitionByMembership(guildWith(['1', '3']), ['1', '2', '3'])

	assert.deepEqual([...present].sort(), ['1', '3'])
	assert.deepEqual(departed, ['2'])
})

test('everyone departed when the guild has none of them', async () => {
	const { present, departed } = await partitionByMembership(guildWith([]), ['1', '2'])

	assert.equal(present.size, 0)
	assert.deepEqual(departed, ['1', '2'])
})

test('nobody departed when all are present', async () => {
	const { departed } = await partitionByMembership(guildWith(['1', '2']), ['1', '2'])

	assert.deepEqual(departed, [])
})

test('handles an empty id list without calling Discord', async () => {
	let called = false
	const guild = {
		members: {
			fetch: async () => {
				called = true
				return new Map()
			}
		}
	}

	const { present, departed } = await partitionByMembership(guild, [])

	assert.equal(called, false)
	assert.equal(present.size, 0)
	assert.deepEqual(departed, [])
})

test('batches large id lists so Discord is not asked for more than 100 at once', async () => {
	const seen = []
	const guild = {
		members: {
			fetch: async ({ user }) => {
				seen.push(user.length)
				return new Map()
			}
		}
	}

	await partitionByMembership(
		guild,
		Array.from({ length: 250 }, (_, i) => String(i))
	)

	assert.deepEqual(seen, [100, 100, 50])
})

test('a failed batch is treated as unknown rather than departed', async () => {
	const guild = {
		members: {
			fetch: async () => {
				throw new Error('rate limited')
			}
		}
	}

	const { departed } = await partitionByMembership(guild, ['1', '2'])

	// Nobody is marked departed on an error: that would wrongly deactivate profiles.
	assert.deepEqual(departed, [])
})

test('markDepartedInactive sets active to 0 for departed users only', async () => {
	const calls = []
	const collection = {
		updateMany: async (filter, update) => {
			calls.push({ filter, update })
			return { modifiedCount: filter.userID.$in.length }
		}
	}

	const modified = await markDepartedInactive(collection, ['1', '2'])

	assert.deepEqual(calls[0].filter.userID.$in, ['1', '2'])
	assert.equal(calls[0].update.$set.active, 0)
	assert.equal(modified, 2)
})

test('markDepartedInactive records when they were found to have left', async () => {
	const calls = []
	const collection = {
		updateMany: async (filter, update) => {
			calls.push(update)
			return { modifiedCount: 1 }
		}
	}

	await markDepartedInactive(collection, ['1'])

	assert.ok(calls[0].$set.leftAt instanceof Date)
})

test('markDepartedInactive only touches profiles still marked active', async () => {
	const calls = []
	const collection = {
		updateMany: async (filter) => {
			calls.push(filter)
			return { modifiedCount: 0 }
		}
	}

	await markDepartedInactive(collection, ['1'])

	assert.equal(calls[0].active, 1)
})

test('markDepartedInactive does nothing when nobody departed', async () => {
	let called = false
	const collection = {
		updateMany: async () => {
			called = true
			return { modifiedCount: 0 }
		}
	}

	const modified = await markDepartedInactive(collection, [])

	assert.equal(called, false)
	assert.equal(modified, 0)
})

// --- inactivity sweep -------------------------------------------------------

const DAY = 1000 * 60 * 60 * 24
const NOW = 1_800_000_000_000

const profile = (over = {}) => ({
	userID: '1',
	author: 'someone',
	count: 0,
	otherCount: 0,
	assigned: [],
	active: 1,
	lastTimestamp: NOW,
	...over
})

test('a quiet low-count profile is marked inactive after 31 days', () => {
	const selected = selectInactiveProfiles([profile({ otherCount: 5, lastTimestamp: NOW - 32 * DAY })], NOW)

	assert.equal(selected.length, 1)
})

test('a quiet low-count profile is left alone before 31 days', () => {
	const selected = selectInactiveProfiles([profile({ otherCount: 5, lastTimestamp: NOW - 20 * DAY })], NOW)

	assert.deepEqual(selected, [])
})

test('a busy profile is not caught by the 31 day rule', () => {
	const selected = selectInactiveProfiles([profile({ otherCount: 50, lastTimestamp: NOW - 40 * DAY })], NOW)

	assert.deepEqual(selected, [])
})

test('a scouter is marked inactive after three months', () => {
	const selected = selectInactiveProfiles(
		[profile({ otherCount: 500, assigned: ['role1'], lastTimestamp: NOW - 100 * DAY })],
		NOW
	)

	assert.equal(selected.length, 1)
})

test('a scouter quiet for only two months is left alone', () => {
	const selected = selectInactiveProfiles(
		[profile({ otherCount: 500, assigned: ['role1'], lastTimestamp: NOW - 60 * DAY })],
		NOW
	)

	assert.deepEqual(selected, [])
})

test('profiles already inactive are not selected again', () => {
	const selected = selectInactiveProfiles([profile({ active: 0, otherCount: 1, lastTimestamp: NOW - 400 * DAY })], NOW)

	assert.deepEqual(selected, [])
})

test('the counted total includes alt1 counts', () => {
	const busyViaAlt1 = profile({ alt1: { otherCount: 20 }, lastTimestamp: NOW - 40 * DAY })

	assert.deepEqual(selectInactiveProfiles([busyViaAlt1], NOW), [])
})

test('the report says why each profile was marked', () => {
	const lines = buildInactiveReport([{ author: 'a', userID: '1', reason: 'left the server' }])

	assert.match(lines[0], /left the server/)
	assert.match(lines[0], /a/)
})

test('the report splits into chunks under the Discord message limit', () => {
	const many = Array.from({ length: 400 }, (_, i) => ({
		author: `scouter-with-a-long-name-${i}`,
		userID: String(100000000000000000 + i),
		reason: 'no activity for 31 days'
	}))

	const chunks = buildInactiveReport(many)

	assert.ok(chunks.length > 1)
	for (const chunk of chunks) assert.ok(chunk.length <= 2000, `chunk was ${chunk.length}`)
})

test('the report is empty when nothing changed', () => {
	assert.deepEqual(buildInactiveReport([]), [])
})

test('a small report is sent as chunked messages', () => {
	const plan = planReportDelivery(['line one', 'line two'])

	assert.equal(plan.mode, 'messages')
	assert.equal(plan.chunks.length, 2)
})

test('a large report is sent as a single file instead of many messages', () => {
	const plan = planReportDelivery(Array.from({ length: 55 }, (_, i) => `chunk ${i}`))

	assert.equal(plan.mode, 'file')
	assert.ok(plan.content.includes('chunk 54'))
})

test('the file plan keeps every line', () => {
	const chunks = Array.from({ length: 20 }, (_, i) => `chunk ${i}`)
	const plan = planReportDelivery(chunks)

	for (const chunk of chunks) assert.ok(plan.content.includes(chunk))
})

test('nothing to report means nothing to send', () => {
	assert.equal(planReportDelivery([]).mode, 'none')
})

test('scouters are reported separately from everyone else', () => {
	const { owners, general } = splitReportAudience([
		{ author: 'a', userID: '1', reason: 'left the server', isScouter: true },
		{ author: 'b', userID: '2', reason: 'left the server', isScouter: false }
	])

	assert.equal(owners.length, 1)
	assert.equal(owners[0].userID, '1')
	assert.equal(general.length, 1)
	assert.equal(general[0].userID, '2')
})

test('no scouters means nothing for the owners channel', () => {
	const { owners, general } = splitReportAudience([{ author: 'b', userID: '2', reason: 'quiet', isScouter: false }])

	assert.deepEqual(owners, [])
	assert.equal(general.length, 1)
})

test('entries without the flag are treated as general', () => {
	const { owners, general } = splitReportAudience([{ author: 'b', userID: '2', reason: 'quiet' }])

	assert.deepEqual(owners, [])
	assert.equal(general.length, 1)
})

// A production sweep logged "Members didn't arrive in time." for a batch of
// 100. Discord times the request out under load; the whole batch was then
// written off as unknown, so those profiles went unchecked for six hours.
const flakyGuild = (presentIds, { failFirstBatchesOfSize = 100 } = {}) => {
	const attempts = []
	return {
		attempts,
		members: {
			fetch: async ({ user }) => {
				attempts.push(user.length)
				if (user.length >= failFirstBatchesOfSize) {
					const error = new Error("Members didn't arrive in time.")
					throw error
				}
				const found = user.filter((id) => presentIds.includes(id))
				return new Map(found.map((id) => [id, { id }]))
			}
		}
	}
}

test('a timed-out batch is retried in smaller pieces', async () => {
	const ids = Array.from({ length: 100 }, (_, i) => String(i))
	const guild = flakyGuild(ids.filter((id) => Number(id) % 2 === 0))

	const { present, departed } = await partitionByMembership(guild, ids)

	// The batch of 100 fails, then the halves succeed.
	assert.equal(guild.attempts[0], 100)
	assert.equal(guild.attempts.length > 1, true)
	assert.equal(present.size, 50)
	assert.equal(departed.length, 50)
})

test('a batch that fails however small it gets is left unknown', async () => {
	const guild = flakyGuild(['1'], { failFirstBatchesOfSize: 1 })

	const { present, departed } = await partitionByMembership(guild, ['1', '2'])

	assert.equal(present.size, 0)
	assert.deepEqual(departed, [])
})

// Stripping a role needs the member object, not just the id. Returning what was
// already fetched keeps it to one round of requests rather than a second fetch
// per candidate.
test('partitionByMembership hands back the members it fetched', async () => {
	const { members } = await partitionByMembership(guildWith(['1', '3']), ['1', '2', '3'])

	assert.deepEqual([...members.keys()].sort(), ['1', '3'])
	assert.equal(members.get('1').id, '1')
})

test('selectStrippable picks inactive profiles that still hold a role', () => {
	const selected = selectStrippable([
		{ userID: '1', active: 0, assigned: ['r1'] },
		{ userID: '2', active: 1, assigned: ['r1'] },
		{ userID: '3', active: 0, assigned: [] }
	])

	assert.deepEqual(
		selected.map((profile) => profile.userID),
		['1']
	)
})

// /privacy optout upserts profiles with no assigned list at all.
test('selectStrippable tolerates a profile with no assigned list', () => {
	assert.deepEqual(selectStrippable([{ userID: '1', active: 0 }]), [])
})

// Documents predating the flag have no `active` field. Reading that as inactive
// would take the roles off scouters who are still working.
test('selectStrippable leaves a profile predating the active flag alone', () => {
	assert.deepEqual(selectStrippable([{ userID: '1', assigned: ['r1'] }]), [])
})

test('strippableRoles keeps roles the bot sits above', () => {
	const scouter = { id: 'r1', name: 'Scouter', editable: true, managed: false }

	assert.deepEqual(strippableRoles([scouter]), [scouter])
})

// Every removal would 403. Dropping the role once beats N failed requests.
test('strippableRoles drops a role positioned above the bot', () => {
	assert.deepEqual(strippableRoles([{ id: 'r1', name: 'Scouter', editable: false, managed: false }]), [])
})

test('strippableRoles drops a role Discord manages', () => {
	assert.deepEqual(strippableRoles([{ id: 'r1', name: 'Booster', editable: true, managed: true }]), [])
})

const scouterRole = { id: 'r1', name: 'Scouter', editable: true, managed: false }
const verifiedRole = { id: 'r2', name: 'Verified Scouter', editable: true, managed: false }

const discordError = (code) => Object.assign(new Error(`Discord ${code}`), { code })

const memberWith = (id, roleIds, { failWith = {} } = {}) => {
	const held = new Set(roleIds)
	const member = { id, removed: [], reasons: [] }
	member.roles = {
		cache: { has: (roleId) => held.has(roleId) },
		remove: async (role, reason) => {
			if (failWith[role.id]) throw failWith[role.id]
			held.delete(role.id)
			member.removed.push(role.id)
			member.reasons.push(reason)
			return member
		}
	}
	return member
}

const guildOf = (members) => {
	const guild = { fetches: 0 }
	guild.members = {
		fetch: async ({ user }) => {
			guild.fetches += 1
			return new Map(user.filter((id) => members[id]).map((id) => [id, members[id]]))
		}
	}
	return guild
}

const tracker = () => {
	const writes = []
	return { writes, updateOne: async (filter, update) => writes.push({ filter, update }) }
}

test('stripInactiveRoles removes every strippable role the member still holds', async () => {
	const member = memberWith('1', ['r1', 'r2'])
	const scoutTracker = tracker()

	await stripInactiveRoles({
		guild: guildOf({ 1: member }),
		roles: [scouterRole, verifiedRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1', 'r2'] }],
		scoutTracker
	})

	assert.deepEqual(member.removed, ['r1', 'r2'])
})

test('the removal carries a reason for the audit log', async () => {
	const member = memberWith('1', ['r1'])

	await stripInactiveRoles({
		guild: guildOf({ 1: member }),
		roles: [scouterRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1'] }],
		scoutTracker: tracker()
	})

	assert.equal(typeof member.reasons[0], 'string')
	assert.match(member.reasons[0], /inactive/i)
})

test('assigned only loses the roles that came off in Discord', async () => {
	const member = memberWith('1', ['r1', 'r2'], { failWith: { r2: discordError(50013) } })
	const scoutTracker = tracker()

	await stripInactiveRoles({
		guild: guildOf({ 1: member }),
		roles: [scouterRole, verifiedRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1', 'r2'] }],
		scoutTracker
	})

	assert.equal(scoutTracker.writes.length, 1)
	assert.deepEqual(scoutTracker.writes[0].filter, { userID: '1' })
	assert.deepEqual(scoutTracker.writes[0].update.$pullAll.assigned, ['r1'])
})

// The role is already gone with them, and `assigned` is the record of what they
// held if they ever come back.
test('someone who has left the guild is left completely alone', async () => {
	const scoutTracker = tracker()

	const entries = await stripInactiveRoles({
		guild: guildOf({}),
		roles: [scouterRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1'] }],
		scoutTracker
	})

	assert.deepEqual(scoutTracker.writes, [])
	assert.deepEqual(entries, [])
})

// partitionByMembership calls a failed fetch unknown rather than departed, so a
// rate limit must not be read as "they left" here either.
test('a member whose fetch failed is skipped rather than stripped', async () => {
	const scoutTracker = tracker()
	const guild = {
		members: {
			fetch: async () => {
				throw new Error('rate limited')
			}
		}
	}

	const entries = await stripInactiveRoles({
		guild,
		roles: [scouterRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1'] }],
		scoutTracker
	})

	assert.deepEqual(scoutTracker.writes, [])
	assert.deepEqual(entries, [])
})

test('a member who left between the fetch and the removal is not written back', async () => {
	const member = memberWith('1', ['r1'], { failWith: { r1: discordError(10007) } })
	const scoutTracker = tracker()

	await stripInactiveRoles({
		guild: guildOf({ 1: member }),
		roles: [scouterRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1'] }],
		scoutTracker
	})

	assert.deepEqual(scoutTracker.writes, [])
})

test('a role the member no longer holds is not removed again', async () => {
	const member = memberWith('1', [])
	const scoutTracker = tracker()

	await stripInactiveRoles({
		guild: guildOf({ 1: member }),
		roles: [scouterRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1'] }],
		scoutTracker
	})

	assert.deepEqual(member.removed, [])
	assert.deepEqual(scoutTracker.writes, [])
})

test('a role the bot cannot manage never reaches Discord', async () => {
	const member = memberWith('1', ['r1'])

	await stripInactiveRoles({
		guild: guildOf({ 1: member }),
		roles: [{ ...scouterRole, editable: false }],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1'] }],
		scoutTracker: tracker()
	})

	assert.deepEqual(member.removed, [])
})

test('nothing to strip means Discord is not asked at all', async () => {
	const guild = guildOf({})

	const entries = await stripInactiveRoles({
		guild,
		roles: [scouterRole],
		profiles: [{ userID: '1', author: 'a', active: 1, assigned: ['r1'] }],
		scoutTracker: tracker()
	})

	assert.equal(guild.fetches, 0)
	assert.deepEqual(entries, [])
})

test('an entry names the roles that were taken off', async () => {
	const entries = await stripInactiveRoles({
		guild: guildOf({ 1: memberWith('1', ['r1', 'r2']) }),
		roles: [scouterRole, verifiedRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1', 'r2'] }],
		scoutTracker: tracker()
	})

	assert.equal(entries.length, 1)
	assert.equal(entries[0].userID, '1')
	assert.equal(entries[0].author, 'a')
	assert.match(entries[0].reason, /Scouter/)
	assert.match(entries[0].reason, /Verified Scouter/)
})

// Losing a scouter role is a staffing matter, so the report goes to the owners
// channel the same way an inactive scouter does.
test('stripped members are reported to the owners channel', async () => {
	const entries = await stripInactiveRoles({
		guild: guildOf({ 1: memberWith('1', ['r1']) }),
		roles: [scouterRole],
		profiles: [{ userID: '1', author: 'a', active: 0, assigned: ['r1'] }],
		scoutTracker: tracker()
	})

	const { owners, general } = splitReportAudience(entries)

	assert.equal(owners.length, 1)
	assert.deepEqual(general, [])
})
