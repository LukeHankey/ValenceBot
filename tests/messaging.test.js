import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { onMessageCreate, onMessageDelete, DSF_GUILDS } from '../src/messaging/handlers.js'
import { MongoDataBase } from '../src/DataBase.js'

const fakeClient = (sent = []) => {
	const database = new MongoDataBase('Members')
	database.db = { collection: () => ({ findOne: async () => ({ channels: { errors: 'err-chan', logs: 'log-chan' } }) }) }
	database.discord = { channels: { cache: { get: (id) => ({ id, send: async (m) => sent.push([id, m]) }) } } }
	return { database, logger: { info() {}, error() {} } }
}

test('DSFMessaging handles calls only in DSF and the test server', async () => {
	const seen = []
	const handle = async (client, message) => seen.push(message.id)
	const client = fakeClient()
	await onMessageCreate(client, { id: 'dsf', guild: { id: DSF_GUILDS[0] } }, handle)
	await onMessageCreate(client, { id: 'test', guild: { id: DSF_GUILDS[1] } }, handle)
	await onMessageCreate(client, { id: 'elsewhere', guild: { id: 'other' } }, handle)
	await onMessageCreate(client, { id: 'dm', guild: null }, handle)
	await onMessageDelete(client, { id: 'deleted', guild: { id: DSF_GUILDS[0] } }, handle)
	assert.deepEqual(seen, ['dsf', 'test', 'deleted'])
})

test('a failing call handler is reported to the error channel, not thrown', async () => {
	const sent = []
	const client = fakeClient(sent)
	await onMessageCreate(client, { guild: { id: DSF_GUILDS[0] } }, async () => {
		throw new Error('boom')
	})
	assert.equal(sent.length, 1)
	assert.equal(sent[0][0], 'err-chan')
})

test('the database finds channels through its own client, not by importing ValenceBot', async () => {
	// Importing ./index.js from DataBase.js would start ValenceBot inside
	// DSFMessaging and log in with ValenceBot's token.
	assert.doesNotMatch(readFileSync(new URL('../src/DataBase.js', import.meta.url), 'utf8'), /import\(['"]\.\/index\.js['"]\)/)

	const database = new MongoDataBase('Members')
	database.db = { collection: () => ({ findOne: async () => ({ channels: { errors: 'e', logs: 'l' } }) }) }
	database.discord = { channels: { cache: { get: () => undefined } } }
	const channels = await database.channels
	// A bot that cannot see the channel logs instead of crashing.
	await assert.doesNotReject(async () => channels.errors.send(new Error('x')))
	await assert.doesNotReject(async () => channels.logs.send('hello'))
})
