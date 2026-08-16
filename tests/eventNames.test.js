import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'

import { Events, RESTEvents } from 'discord.js'

// The handler registers each file under its own name: `ready.js` becomes
// client.on('ready'). A file named after an event that no longer exists is
// silently never called, which is how the rate limit reporter went quiet when
// @discordjs/rest v2 renamed the event to `rateLimited`, and what would have
// happened to startup when v15 drops `ready` in favour of `clientReady`.
const gatewayEvents = new Set(Object.values(Events))
const restEvents = new Set(Object.values(RESTEvents))

const handlerNames = (dir) => readdirSync(dir).map((file) => file.split('.')[0])

test('every client event handler is named after a real event', () => {
	for (const name of handlerNames('src/events/client')) {
		assert.equal(
			gatewayEvents.has(name) || restEvents.has(name),
			true,
			`src/events/client/${name}.js is not a discord.js event, so it will never fire`
		)
	}
})

test('every guild event handler is named after a real event', () => {
	for (const name of handlerNames('src/events/guild')) {
		assert.equal(
			gatewayEvents.has(name) || restEvents.has(name),
			true,
			`src/events/guild/${name}.js is not a discord.js event, so it will never fire`
		)
	}
})

test('startup is wired to clientReady rather than the deprecated ready', () => {
	assert.equal(handlerNames('src/events/client').includes('clientReady'), true)
	assert.equal(handlerNames('src/events/client').includes('ready'), false)
})

test('the rate limit reporter is wired to the REST event name', () => {
	assert.equal(handlerNames('src/events/guild').includes('rateLimited'), true)
	assert.equal(restEvents.has('rateLimited'), true)
})
