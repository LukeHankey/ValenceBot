import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'

import { planRegistration } from '../src/registerCommands.js'

const DSF = '420803245758480405'
const TEST = '668330890790699079'
const names = (list) => list.map((d) => d.name).sort()

test('global for "all", per guild otherwise, a bare string works, and the context menus are kept', () => {
	const cmd = (name, guildSpecific) => ({ data: { name }, slash: () => {}, guildSpecific })
	const { global, guilds } = planRegistration([
		cmd('help', 'all'),
		cmd('dsf', [TEST, DSF]),
		cmd('reply', TEST),
		{ data: { name: 'noslash' }, guildSpecific: 'all' }
	])

	assert.deepEqual(names(global), ['help'])
	assert.deepEqual(names(guilds.get(DSF)), ['Affiliate Events', 'Mark event as dead.', 'dsf'])
	assert.deepEqual(names(guilds.get(TEST)), ['Affiliate Events', 'Mark event as dead.', 'dsf', 'reply'])
})

test('every command file plans without duplicate names in any scope', async () => {
	const commands = await Promise.all(
		readdirSync('src/commands').map(async (file) => (await import(`../src/commands/${file}`)).default)
	)
	const { global, guilds } = planRegistration(commands)
	for (const list of [global, ...guilds.values()]) {
		const json = list.map((d) => d.toJSON())
		assert.equal(new Set(json.map((d) => d.name)).size, json.length)
	}
	assert.equal(global.length, commands.filter((c) => c.guildSpecific === 'all').length)
})
