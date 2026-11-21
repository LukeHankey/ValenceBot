import test from 'node:test'
import assert from 'node:assert/strict'

import interactionCreate from '../src/events/guild/interactionCreate.js'
import { isNoEventResponse } from '../src/dsf/calls/main.js'
import Ticket from '../src/ticket.js'

// autoComplete.js:8 and commands.js:11 crashed on interactions with no guild
// or channel: a global command used in a DM, or in a server without the bot.
const outsideGuild = (kind) => {
	const calls = []
	return {
		calls,
		interaction: {
			inCachedGuild: () => false,
			isAutocomplete: () => kind === 'autocomplete',
			isRepliable: () => kind === 'command',
			respond: async (choices) => calls.push(['respond', choices]),
			reply: async (options) => calls.push(['reply', options])
		}
	}
}
const untouchedClient = {
	database: {
		get settings() {
			throw new Error('should not reach the database')
		}
	}
}

test('a command outside a server the bot is in gets a reply instead of a crash', async () => {
	const { interaction, calls } = outsideGuild('command')
	await interactionCreate(untouchedClient, interaction)
	assert.equal(calls.length, 1)
	assert.equal(calls[0][0], 'reply')
	assert.match(calls[0][1].content, /inside a server/)
})

test('autocomplete outside a server answers with no choices', async () => {
	const { interaction, calls } = outsideGuild('autocomplete')
	await interactionCreate(untouchedClient, interaction)
	assert.deepEqual(calls, [['respond', []]])
})

// main.js:37 reported DSF-Server's expected "nothing to attach to" 404s.
const notFound = (detail) => ({ response: { status: 404, data: { detail } } })

test('the DSF-Server 404s that mean "no event" are not errors', () => {
	assert.equal(isNoEventResponse(notFound('No active event found for this world')), true)
	assert.equal(isNoEventResponse(notFound('World not found')), true)
	assert.equal(isNoEventResponse(notFound('Stuck event has expired')), true)
})

test('any other failure from DSF-Server is still an error', () => {
	assert.equal(isNoEventResponse(notFound('Not Found')), false)
	assert.equal(isNoEventResponse({ response: { status: 500, data: { detail: 'World not found' } } }), false)
	assert.equal(isNoEventResponse(new Error('ECONNREFUSED')), false)
})

// ticket.js:219: Missing Permissions on pin failed a ticket that already existed.
test('a ticket whose welcome message cannot be pinned is still created', async () => {
	const warnings = []
	const ticket = new Ticket(
		{
			message: { id: 'msg-1' },
			client: { logger: { warn: (m) => warnings.push(m) } }
		},
		{ ticket: [{ messageId: 'msg-1', role: 'role-1', application: false }] },
		null
	)
	const channel = {
		id: 'chan-1',
		send: async () => ({
			pin: async () => {
				throw Object.assign(new Error('Missing Permissions'), { code: 50013 })
			}
		})
	}

	await ticket._sendInitialResponse(channel, 'member-1')
	assert.equal(warnings.length, 1)
	assert.match(warnings[0], /Could not pin the ticket message in chan-1: Missing Permissions/)
})
