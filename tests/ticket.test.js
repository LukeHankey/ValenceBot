import test from 'node:test'
import assert from 'node:assert/strict'
import { ChannelType } from 'discord.js'

import Ticket from '../src/ticket.js'

const TICKET_MESSAGE = 'msg-1'

const ticketData = (overrides = {}) => ({
	ticket: [
		{
			messageId: TICKET_MESSAGE,
			prefer: 'Channels',
			role: 'role-1',
			application: false,
			channelId: 'chan-1',
			...overrides
		}
	]
})

// Discord lowercases a channel name and replaces spaces with hyphens, so
// "Ticket by Praise Lord Helix" becomes "ticket-by-praise-lord-helix".
const asChannelName = (name) =>
	name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')

const channelCollection = (channels) => ({
	filter: (fn) => channelCollection(channels.filter(fn)),
	get: (id) => channels.find((c) => c.id === id),
	first: () => channels[0],
	get size() {
		return channels.length
	},
	// A plain iterator rather than a generator: prettier and eslint disagree
	// about where the star goes, and this needs neither.
	[Symbol.iterator]: () => channels.map((channel) => [channel.id, channel])[Symbol.iterator]()
})

const openChannelFor = (displayName) => ({
	id: 'open-1',
	name: asChannelName(`Ticket by ${displayName}`),
	type: ChannelType.GuildText,
	parentId: 'parent-1',
	permissionOverwrites: {
		cache: {
			has: () => true,
			get: () => ({ allow: { has: () => true } })
		}
	},
	messages: { fetchPinned: async () => ({ first: () => undefined }) }
})

const ticketFor = (displayName, extraChannels = []) => {
	const anchor = { id: 'chan-1', name: 'tickets', type: ChannelType.GuildText, parentId: 'parent-1' }
	const channels = [anchor, ...extraChannels]

	const interaction = {
		message: { id: TICKET_MESSAGE },
		member: { id: 'user-1', displayName },
		guild: { id: 'guild-1', channels: { cache: channelCollection(channels) } },
		channel: { parentId: 'parent-1' }
	}

	return new Ticket(interaction, ticketData(), {})
}

test('the ticket for this message is the one acted on', () => {
	const ticket = ticketFor('someone')

	assert.equal(ticket.currentTicket.messageId, TICKET_MESSAGE)
	assert.equal(ticket.preference, 'Channels')
	assert.equal(ticket.roleId, 'role-1')
	assert.equal(ticket.isApplication(), false)
})

test('a single-word name with an open channel is found', async () => {
	const ticket = ticketFor('someone', [openChannelFor('someone')])

	assert.notEqual(await ticket.hasOpenTicket(), null)
})

test('a name containing spaces is still matched', async () => {
	// Discord slugifies the channel name, so "Praise Lord Helix" becomes
	// "praise-lord-helix" and a straight includes() of the display name never
	// matched — the user could open a second ticket while one was still open.
	const ticket = ticketFor('Praise Lord Helix', [openChannelFor('Praise Lord Helix')])

	assert.notEqual(await ticket.hasOpenTicket(), null)
})

test('a name containing punctuation is still matched', async () => {
	// Names like "berx/0 enrage" lose the slash entirely in a channel name.
	const ticket = ticketFor('berx/0 enrage', [openChannelFor('berx/0 enrage')])

	assert.notEqual(await ticket.hasOpenTicket(), null)
})

test('someone with no open channel gets none', async () => {
	const ticket = ticketFor('someone', [openChannelFor('somebody else')])

	assert.equal(await ticket.hasOpenTicket(), null)
})

test('a channel in another category does not count', async () => {
	const elsewhere = { ...openChannelFor('someone'), parentId: 'parent-2' }
	const ticket = ticketFor('someone', [elsewhere])

	assert.equal(await ticket.hasOpenTicket(), null)
})

// create() picks a private thread or a channel purely from the stored
// preference. It used to also require guild boost Tier 2 for threads, a
// Discord restriction removed in 2022 — so an unboosted server that asked for
// Threads silently got Channels, its setting was rewritten, and the owner was
// DMed about a limit that no longer exists.
const creatingTicket = (prefer, premiumTier) => {
	const created = { threads: [], channels: [] }
	const sent = { content: null, pinned: false }

	const message = {
		id: TICKET_MESSAGE,
		author: { id: 'bot-1' },
		content: '',
		pin: async () => {
			sent.pinned = true
		}
	}
	const newChannel = {
		send: async ({ content }) => {
			sent.content = content
			return message
		}
	}

	const interaction = {
		message,
		member: { id: 'user-1', displayName: 'someone' },
		guild: {
			id: 'guild-1',
			premiumTier,
			channels: {
				create: async (opts) => {
					created.channels.push(opts)
					return newChannel
				}
			}
		},
		channel: {
			parentId: 'parent-1',
			threads: {
				create: async (opts) => {
					created.threads.push(opts)
					return newChannel
				}
			}
		}
	}

	const ticket = new Ticket(interaction, ticketData({ prefer }), {})
	return { ticket, created, sent }
}

test('an unboosted server still gets a private thread when it asked for one', async () => {
	const { ticket, created } = creatingTicket('Threads', 0)

	await ticket.create()

	assert.equal(created.threads.length, 1)
	assert.equal(created.channels.length, 0)
	assert.equal(created.threads[0].type, ChannelType.PrivateThread)
})

test('a boosted server gets a private thread too', async () => {
	const { ticket, created } = creatingTicket('Threads', 2)

	await ticket.create()

	assert.equal(created.threads.length, 1)
})

test('a server preferring channels gets a channel', async () => {
	const { ticket, created } = creatingTicket('Channels', 0)

	await ticket.create()

	assert.equal(created.channels.length, 1)
	assert.equal(created.threads.length, 0)
})

test('the opening message is pinned so the ticket can be found again', async () => {
	const { ticket, sent } = creatingTicket('Channels', 0)

	await ticket.create()

	assert.match(sent.content, /will be with you shortly/)
	assert.equal(sent.pinned, true)
})
