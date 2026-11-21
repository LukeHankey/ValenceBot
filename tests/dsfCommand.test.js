import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'

import dsf, { storedCallFields } from '../src/commands/dsf.js'
import { sendText } from '../src/DataBase.js'

test('every command is a slash command now', async () => {
	for (const file of readdirSync(new URL('../src/commands/', import.meta.url))) {
		const command = (await import(`../src/commands/${file}`)).default
		assert.equal(command.run, undefined, `${command.name} still has a prefix handler`)
		assert.equal(typeof command.slash, 'function', `${command.name} has no slash handler`)
	}
})

test('/dsf has the four admin subcommands, paired with usage for /help', () => {
	assert.equal(dsf.permissionLevel, 'Admin')
	assert.deepEqual(
		dsf.data.toJSON().options.map((o) => o.name),
		['calls', 'calls-clear', 'view', 'adjust']
	)
	assert.equal(dsf.usage.length, dsf.description.length)
})

test('stored calls link to their message', () => {
	const [field] = storedCallFields([{ author: 'Ann', time: 0, content: 'w84', messageID: 'm1' }], 'g', 'c')
	assert.equal(field.name, 'Ann')
	assert.match(field.value, /\[w84\]\(https:\/\/discord\.com\/channels\/g\/c\/m1\)/)
})

const adjust = async (amount, matchedCount = 1) => {
	const updates = []
	const replies = []
	const logged = []
	const client = {
		database: {
			settings: {},
			scoutTracker: {
				updateOne: async (...args) => {
					updates.push(args)
					return { matchedCount }
				}
			},
			channels: Promise.resolve({ logs: { send: async (...args) => logged.push(args) } })
		}
	}
	const interaction = {
		guildId: 'g',
		user: { id: 'admin' },
		options: {
			getSubcommand: () => 'adjust',
			getUser: () => ({ id: 'member' }),
			getInteger: () => amount
		},
		reply: async (r) => replies.push(r)
	}
	await dsf.slash(client, interaction, { admin: true })
	return { updates, replies, logged }
}

test('adjust adds or removes other count, and logs it', async () => {
	const added = await adjust(3)
	assert.deepEqual(added.updates, [[{ userID: 'member' }, { $inc: { otherCount: 3 } }]])
	assert.match(added.replies[0].content, /Added 3 other count to/)
	assert.equal(added.logged.length, 1)

	const removed = await adjust(-2)
	assert.deepEqual(removed.updates, [[{ userID: 'member' }, { $inc: { otherCount: -2 } }]])
	assert.match(removed.replies[0].content, /Removed 2 other count from/)
})

test('adjust refuses 0 and says when there is no profile', async () => {
	const zero = await adjust(0)
	assert.deepEqual(zero.updates, [])
	const missing = await adjust(5, 0)
	assert.match(missing.replies[0].content, /has no profile/)
	assert.equal(missing.logged.length, 0)
})

test('log sends accept text with options, or a whole message object', async () => {
	const sent = []
	const channel = { send: async (m) => sent.push(m) }
	await sendText(channel, 'hello', { allowedMentions: { parse: [] } })
	await sendText(channel, { content: 'hi', allowedMentions: { parse: [] } })
	assert.deepEqual(sent, [
		{ content: 'hello', allowedMentions: { parse: [] } },
		{ content: 'hi', allowedMentions: { parse: [] } }
	])
	// No channel visible to this bot: logged, not thrown.
	assert.doesNotThrow(() => sendText(undefined, { content: 'x' }))
})
