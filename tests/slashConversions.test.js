import test from 'node:test'
import assert from 'node:assert/strict'

import raven, { ravenMessage } from '../src/commands/raven.js'
import kick, { kickRefusal } from '../src/commands/kick.js'
import help, { visibleCommands } from '../src/commands/help.js'
import fact, { removeFact } from '../src/commands/fact.js'
import reply from '../src/commands/reply.js'

test('the converted commands are slash-only, with usage and description paired for /help', () => {
	for (const command of [raven, kick, help, fact, reply]) {
		assert.equal(command.run, undefined, command.name)
		assert.equal(typeof command.slash, 'function', command.name)
		assert.equal(command.data.toJSON().name, command.name)
		assert.equal(command.usage.length, command.description.length, command.name)
	}
})

test('a raven appears every 13th rune day', () => {
	assert.equal(ravenMessage(26), 'There is a raven today!')
	assert.equal(ravenMessage(27), 'The next raven will appear in 12 days.')
	assert.equal(ravenMessage(38), 'The next raven will appear in 1 days.')
})

const member = (id, rank, kickable = true) => ({ id, kickable, roles: { highest: { rawPosition: rank } } })
const guild = (canKick = true) => ({ ownerId: 'owner', members: { me: { permissions: { has: () => canKick } } } })

test('kick refuses the owner, yourself, a higher rank, and what the bot cannot kick', () => {
	const mod = member('mod', 5)
	assert.match(kickRefusal({ guild: guild(false), executor: mod, target: member('x', 1) }), /Kick Members/)
	assert.match(kickRefusal({ guild: guild(), executor: mod, target: member('owner', 1) }), /owner/)
	assert.match(kickRefusal({ guild: guild(), executor: mod, target: member('mod', 5) }), /yourself/)
	assert.match(kickRefusal({ guild: guild(), executor: mod, target: member('x', 6) }), /higher role/)
	assert.match(kickRefusal({ guild: guild(), executor: mod, target: member('x', 1, false) }), /above mine/)
	assert.equal(kickRefusal({ guild: guild(), executor: mod, target: member('x', 5) }), null)
})

test('help lists only slash commands for this guild at or below the user’s level', () => {
	const commands = new Map(
		[
			{ name: 'raven', slash() {}, guildSpecific: 'all', permissionLevel: 'Everyone' },
			{ name: 'kick', slash() {}, guildSpecific: 'all', permissionLevel: 'Mod' },
			{ name: 'reply', slash() {}, guildSpecific: 'g1', permissionLevel: 'Owner' },
			{ name: 'fact', slash() {}, guildSpecific: ['g2'], permissionLevel: 'Mod' },
			{ name: 'dsf', run() {}, guildSpecific: 'all', permissionLevel: 'Everyone' }
		].map((c) => [c.name, c])
	)
	assert.deepEqual(visibleCommands(commands, 'g1', {}), ['raven'])
	assert.deepEqual(visibleCommands(commands, 'g1', { mod: true }), ['kick', 'raven'])
	assert.deepEqual(visibleCommands(commands, 'g1', { owner: true }), ['kick', 'raven', 'reply'])
	assert.deepEqual(visibleCommands(commands, 'g2', { admin: true }), ['fact', 'kick', 'raven'])
})

// A tiny stand-in for the Facts collection: just the three calls removeFact makes.
const factsCollection = (docs) => ({
	docs,
	findOne: async ({ number }) => docs.find((d) => d.number === number) ?? null,
	deleteOne: async ({ _id }) =>
		docs.splice(
			docs.findIndex((d) => d._id === _id),
			1
		),
	updateMany: async (filter, update) => {
		for (const d of docs) if (d.number > filter.number.$gt) d.number += update.$inc.number
	}
})

test('removing a fact deletes that fact and closes the gap', async () => {
	const facts = factsCollection([
		{ _id: 'a', number: 1, Message: 'one' },
		{ _id: 'b', number: 2, Message: 'two' },
		{ _id: 'c', number: 3, Message: 'three' }
	])
	const removed = await removeFact(facts, 2)
	assert.equal(removed.Message, 'two')
	assert.deepEqual(
		facts.docs.map((d) => [d.number, d.Message]),
		[
			[1, 'one'],
			[2, 'three']
		]
	)
	assert.equal(await removeFact(facts, 9), null)
})
