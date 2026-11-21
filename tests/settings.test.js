import test from 'node:test'
import assert from 'node:assert/strict'
import { PermissionFlagsBits } from 'discord.js'

import settings, { roleProblem } from '../src/commands/settings.js'
import roleDelete from '../src/events/guild/roleDelete.js'

const role = (id, perms = [], extra = {}) => ({
	id,
	name: `role-${id}`,
	managed: false,
	permissions: { has: (needed) => [].concat(needed).every((p) => perms.includes(p)) },
	...extra
})

test('settings is a slash command with view and the three settings still in use', () => {
	assert.equal(settings.run, undefined)
	assert.deepEqual(
		settings.data.toJSON().options.map((o) => o.name),
		['view', 'admin-role', 'mod-role', 'admin-channel']
	)
	assert.equal(settings.usage.length, settings.description.length)
})

test('the Admin Role must have Administrator', () => {
	assert.match(roleProblem('admin-role', role('1'), 'g'), /Administrator/)
	assert.equal(roleProblem('admin-role', role('1', [PermissionFlagsBits.Administrator]), 'g'), null)
})

test('the Mod Role must have both Kick and Ban Members', () => {
	assert.match(roleProblem('mod-role', role('1', [PermissionFlagsBits.KickMembers]), 'g'), /Kick Members and Ban/)
	assert.equal(roleProblem('mod-role', role('1', [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers]), 'g'), null)
})

test('@everyone and integration roles are refused', () => {
	const admin = [PermissionFlagsBits.Administrator]
	assert.match(roleProblem('admin-role', role('g', admin), 'g'), /@everyone/)
	assert.match(roleProblem('admin-role', role('1', admin, { managed: true }), 'g'), /integration/)
})

const deletion = (roles) => {
	const updates = []
	const logged = []
	const dms = []
	const client = {
		database: { settings: { findOne: async () => ({ roles }), updateOne: async (...args) => updates.push(args) } },
		channels: { cache: { get: () => ({ send: async (m) => logged.push(m) }) } }
	}
	const deleted = {
		id: '111',
		name: 'Admins',
		guild: { id: 'g', name: 'Guild', fetchOwner: async () => ({ send: async (m) => dms.push(m) }) }
	}
	return { client, deleted, updates, logged, dms }
}

test('deleting the configured Admin Role resets it to the default', async () => {
	const { client, deleted, updates, logged, dms } = deletion({
		adminRole: '<@&111>',
		modRole: '<@&222>',
		defaultAdminRole: '<@&999>'
	})
	await roleDelete(client, deleted)
	assert.deepEqual(updates, [[{ _id: 'g' }, { $set: { 'roles.adminRole': '<@&999>' } }]])
	assert.match(dms[0].content, /\/settings admin-role/)
	assert.equal(logged.length, 1)
})

test('deleting a role that is not configured changes nothing', async () => {
	const { client, deleted, updates, dms } = deletion({ adminRole: '<@&5>', modRole: '<@&6>', defaultAdminRole: '<@&9>' })
	await roleDelete(client, deleted)
	assert.deepEqual(updates, [])
	assert.deepEqual(dms, [])
})
