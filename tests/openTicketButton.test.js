import test from 'node:test'
import assert from 'node:assert/strict'

import { buttons, ticketFailureMessage } from '../src/handlers/interactions/buttons.js'
import Ticket from '../src/ticket.js'

// The person who clicks "Open Ticket" must always get an answer: before, a
// failure inside Ticket.create skipped the reply, and they saw only Discord's
// "This interaction failed".
const setup = () => {
	const calls = []
	const errors = []
	const client = {
		database: {
			channels: Promise.resolve({ errors: { send: (e) => errors.push(e) } }),
			settings: { findOne: async () => ({ ticket: [] }) },
			scoutTracker: {}
		}
	}
	const interaction = {
		customId: 'Open Ticket',
		message: { id: 'panel', content: '' },
		member: { id: 'member-1' },
		user: { id: 'member-1' },
		guild: {
			id: 'some-guild',
			channels: { cache: { get: () => undefined, find: () => undefined } },
			members: { cache: { get: () => undefined } }
		},
		deferReply: async (o) => calls.push(['deferReply', o]),
		editReply: async (o) => calls.push(['editReply', o]),
		reply: async (o) => calls.push(['reply', o])
	}
	return { client, interaction, calls, errors }
}

test('a ticket that cannot be created tells the clicker why, and still reports the error', async (t) => {
	const failure = Object.assign(new Error('Missing Permissions'), { code: 50013 })
	t.mock.method(Ticket.prototype, 'hasOpenTicket', async () => null)
	t.mock.method(Ticket.prototype, 'create', async () => {
		throw failure
	})
	const { client, interaction, calls, errors } = setup()

	await buttons(client, interaction, null, new Map())

	assert.equal(calls[0][0], 'deferReply')
	assert.deepEqual(calls.at(-1), ['editReply', { content: ticketFailureMessage(failure) }])
	assert.match(calls.at(-1)[1].content, /missing permissions/)
	assert.deepEqual(errors, [failure])
})

test('a created ticket answers through the deferred reply', async (t) => {
	t.mock.method(Ticket.prototype, 'hasOpenTicket', async () => null)
	t.mock.method(Ticket.prototype, 'create', async () => ({ id: 'new-chan' }))
	const { client, interaction, calls, errors } = setup()

	await buttons(client, interaction, null, new Map())

	assert.deepEqual(
		calls.map(([kind]) => kind),
		['deferReply', 'editReply']
	)
	assert.match(calls[1][1].content, /<#new-chan>/)
	assert.deepEqual(errors, [])
})

test('other failures get a general message', () => {
	assert.match(ticketFailureMessage(new Error('boom')), /Something went wrong/)
})
