import test from 'node:test'
import assert from 'node:assert/strict'
import { PermissionFlagsBits } from 'discord.js'

import selfAssign, { isSelfAssignable } from '../src/commands/self-assign.js'
import lookup, { lookupText } from '../src/commands/lookup.js'

test('self-assign and lookup are slash-only, with usage and description paired for /help', () => {
	for (const command of [selfAssign, lookup]) {
		assert.equal(command.run, undefined, command.name)
		assert.equal(typeof command.slash, 'function', command.name)
		assert.equal(command.usage.length, command.description.length, command.name)
	}
})

const role = (id, position, perms = [], extra = {}) => ({
	id,
	position,
	managed: false,
	permissions: { has: (p) => perms.includes(p) },
	...extra
})
const guild = (id, roles = []) => ({ id, roles: { cache: new Map(roles.map((r) => [r.id, r])) } })
const bot = role('bot', 50)

test('ordinary roles below the bot are self-assignable in other servers', () => {
	assert.equal(isSelfAssignable(role('r', 10), guild('other'), bot), true)
})

test('never @everyone, integration roles, roles at or above the bot, or roles with moderation permissions', () => {
	const g = guild('other')
	assert.equal(isSelfAssignable(role('other', 0), g, bot), false)
	assert.equal(isSelfAssignable(role('r', 10, [], { managed: true }), g, bot), false)
	assert.equal(isSelfAssignable(role('r', 50), g, bot), false)
	assert.equal(isSelfAssignable(role('r', 10, [PermissionFlagsBits.ManageRoles]), g, bot), false)
	assert.equal(isSelfAssignable(role('r', 10, [PermissionFlagsBits.Administrator]), g, bot), false)
})

test('in DSF only roles below the ceiling role, which is what the list always showed', () => {
	const dsf = guild('420803245758480405', [role('881696440747958342', 20)])
	assert.equal(isSelfAssignable(role('r', 19), dsf, bot), true)
	// Between the ceiling and the bot: listed as unavailable, but the prefix command assigned it.
	assert.equal(isSelfAssignable(role('r', 30), dsf, bot), false)
})

test('in Valence only roles below position 36', () => {
	const valence = guild('472448603642920973')
	assert.equal(isSelfAssignable(role('r', 35), valence, bot), true)
	assert.equal(isSelfAssignable(role('r', 36), valence, bot), false)
})

test('lookup shows counts, with old scout totals in brackets when there are any', () => {
	const base = {
		firstTimestamp: 0,
		firstTimestampReadable: new Date('2026-01-01T12:00:00Z'),
		lastTimestamp: 3_600_000,
		lastTimestampReadable: new Date('2026-01-01T13:00:00Z'),
		count: 5,
		otherCount: 2,
		alt1: { merchantCount: 1, otherCount: 1 },
		alt1First: { merchantCount: 2 },
		active: 1
	}
	const text = lookupText(base)
	assert.match(text, /\*\*Merch count:\*\* 5\n/)
	assert.match(text, /\*\*Alt1 Merch count:\*\* 3\n/)
	assert.match(text, /\*\*Active for:\*\* 1h/)
	assert.match(text, /\*\*Warnings:\*\* 0$/)

	const withOld = lookupText({ ...base, oldScout: { count: 7, otherCount: 1, alt1: { merchantCount: 4 } } })
	assert.match(withOld, /\*\*Merch count:\*\* 5 \(\+7\)/)
	assert.match(withOld, /\*\*Alt1 Merch count:\*\* 3 \(\+4\)/)
})
