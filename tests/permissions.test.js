import test from 'node:test'
import assert from 'node:assert/strict'

import { Permissions } from '../src/classes.js'

const ADMIN_ROLE = '111111111111111111'
const MOD_ROLE = '222222222222222222'
const MEMBER_ROLE = '333333333333333333'

// Higher rawPosition means higher up the role list.
const guildRoles = [
	{ id: ADMIN_ROLE, rawPosition: 10 },
	{ id: MOD_ROLE, rawPosition: 5 },
	{ id: MEMBER_ROLE, rawPosition: 1 }
]

const roleCollection = (roles) => ({
	find: (fn) => roles.find(fn),
	filter: (fn) => roleCollection(roles.filter(fn)),
	map: (fn) => roles.map(fn),
	has: (id) => roles.some((role) => role.id === id)
})

const message = (memberRoleIds, memberId = 'user-1') => ({
	member: { id: memberId, roles: { cache: roleCollection(guildRoles.filter((r) => memberRoleIds.includes(r.id))) } },
	guild: { id: 'guild-1', ownerId: 'owner-1', roles: { cache: roleCollection(guildRoles) } }
})

const settings = (roles) => ({ roles })

test('the configured role id is read out of the settings', () => {
	const perms = new Permissions('adminRole', settings({ adminRole: `<@&${ADMIN_ROLE}>` }), message([]))

	assert.equal(perms.roleId, ADMIN_ROLE)
})

test('someone holding the configured role is recognised', () => {
	const perms = new Permissions('adminRole', settings({ adminRole: `<@&${ADMIN_ROLE}>` }), message([ADMIN_ROLE]))

	assert.deepEqual(perms.memberRole(), [ADMIN_ROLE])
})

test('someone holding a role above the configured one is recognised', () => {
	const perms = new Permissions('modRole', settings({ modRole: `<@&${MOD_ROLE}>` }), message([ADMIN_ROLE]))

	assert.deepEqual(perms.memberRole(), [ADMIN_ROLE])
})

test('someone holding only a lower role is not', () => {
	const perms = new Permissions('modRole', settings({ modRole: `<@&${MOD_ROLE}>` }), message([MEMBER_ROLE]))

	assert.deepEqual(perms.memberRole(), [])
})

test('the roles that would grant permission are listed for the error', () => {
	const perms = new Permissions('modRole', settings({ modRole: `<@&${MOD_ROLE}>` }), message([MEMBER_ROLE]))

	assert.deepEqual(perms.higherRoles(), [`<@&${ADMIN_ROLE}>`, `<@&${MOD_ROLE}>`])
})

test('a guild with no roles configured does not throw', () => {
	// Settings documents are created without a `roles` field until an
	// administrator sets one. `this.db?.roles[this.name]` guards the document
	// but not the field, so reading it threw for every command in that guild.
	assert.doesNotThrow(() => new Permissions('adminRole', {}, message([])).roleId)
})

test('a role setting with no id in it does not throw', () => {
	// `.match(...)[0]` on a value with no digits is a TypeError.
	assert.doesNotThrow(() => new Permissions('adminRole', settings({ adminRole: 'none' }), message([])).roleId)
})

test('a missing settings document does not throw', () => {
	assert.doesNotThrow(() => new Permissions('adminRole', undefined, message([])).roleId)
})

test('an unconfigured role grants nobody permission', () => {
	const perms = new Permissions('adminRole', {}, message([MEMBER_ROLE]))

	assert.deepEqual(perms.memberRole(), [])
})

test('the bot owner is recognised', () => {
	const perms = new Permissions('adminRole', settings({}), message([], '212668377586597888'))

	assert.equal(perms.botOwner(), true)
})

test('anyone else is not the bot owner', () => {
	const perms = new Permissions('adminRole', settings({}), message([], 'someone-else'))

	assert.equal(perms.botOwner(), false)
})

test('a 20 digit role id is still recognised', () => {
	// The pattern allowed 18-19 digits. Snowflakes have grown past that, and an
	// id that does not match reads as "no role configured", which denies
	// permission to everyone in the guild.
	const long = '12345678901234567890'
	const perms = new Permissions('adminRole', settings({ adminRole: `<@&${long}>` }), message([]))

	assert.equal(perms.roleId, long)
})

test('a 17 digit role id is still recognised', () => {
	const short = '12345678901234567'
	const perms = new Permissions('adminRole', settings({ adminRole: `<@&${short}>` }), message([]))

	assert.equal(perms.roleId, short)
})
