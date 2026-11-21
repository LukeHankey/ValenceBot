import test from 'node:test'
import assert from 'node:assert/strict'

import block, { chosenRoles } from '../src/commands/self-assign-block.js'

const run = async (subcommand, roles, { admin = true } = {}) => {
	const updates = []
	const replies = []
	const logs = []
	const client = {
		database: {
			settings: { updateOne: async (...args) => updates.push(args), findOne: async () => ({ selfAssignBlocked: ['x'] }) },
			channels: Promise.resolve({ logs: { send: async (m) => logs.push(m) } })
		}
	}
	const byName = Object.fromEntries(roles.map((id, i) => [i === 0 ? 'role' : `role${i + 1}`, { id }]))
	const interaction = {
		guildId: 'g',
		guild: { name: 'Guild' },
		user: { id: 'admin' },
		options: { getSubcommand: () => subcommand, getRole: (name) => byName[name] ?? null },
		reply: async (r) => replies.push(r)
	}
	await block.slash(client, interaction, { admin, errorA: { embeds: [] } })
	return { updates, replies, logs }
}

test('the command is admin-only and lets an admin give up to five roles', () => {
	assert.equal(block.permissionLevel, 'Admin')
	const add = block.data.toJSON().options.find((o) => o.name === 'add')
	assert.deepEqual(
		add.options.map((o) => [o.name, Boolean(o.required)]),
		[
			['role', true],
			['role2', false],
			['role3', false],
			['role4', false],
			['role5', false]
		]
	)
})

test('the same role given twice counts once', () => {
	const roles = { role: { id: 'a' }, role2: { id: 'a' }, role3: { id: 'b' } }
	assert.deepEqual(
		chosenRoles({ getRole: (n) => roles[n] ?? null }).map((r) => r.id),
		['a', 'b']
	)
})

test('add puts the roles on the server’s blocked list without duplicates', async () => {
	const { updates, logs } = await run('add', ['a', 'b'])
	assert.deepEqual(updates, [[{ _id: 'g' }, { $addToSet: { selfAssignBlocked: { $each: ['a', 'b'] } } }]])
	assert.equal(logs.length, 1)
})

test('remove takes the roles off the list', async () => {
	const { updates } = await run('remove', ['a'])
	assert.deepEqual(updates, [[{ _id: 'g' }, { $pull: { selfAssignBlocked: { $in: ['a'] } } }]])
})

test('non-admins cannot change the list', async () => {
	const { updates, replies } = await run('add', ['a'], { admin: false })
	assert.deepEqual(updates, [])
	assert.equal(replies.length, 1)
})
