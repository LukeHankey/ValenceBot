import test from 'node:test'
import assert from 'node:assert/strict'

import { buildWebhookEditRequest, isValidDuration } from '../src/dsf/calls/eventTimers.js'

test('the webhook edit sends the API key as a header', () => {
	// The key used to be passed inside the request body, where axios sends it
	// as JSON rather than as a header. require_bot_api_key reads the X-API-Key
	// header, so every edit was rejected.
	process.env.BOT_API_KEY = 'secret-key'

	const { config } = buildWebhookEditRequest('123', 'updated content')

	assert.equal(config.headers['X-API-Key'], 'secret-key')
	assert.equal(config.headers['Content-Type'], 'application/json')
})

test('the webhook edit keeps the key out of the body', () => {
	process.env.BOT_API_KEY = 'secret-key'

	const { body } = buildWebhookEditRequest('123', 'updated content')

	assert.deepEqual(body, { content: 'updated content' })
	assert.equal(JSON.stringify(body).includes('secret-key'), false)
})

test('the webhook edit targets the message being edited', () => {
	const { url } = buildWebhookEditRequest('456', 'x')

	assert.match(url, /\/events\/webhook\/456$/)
})

test('a real duration is valid', () => {
	assert.equal(isValidDuration(1000), true)
	assert.equal(isValidDuration(0), true)
})

test('a negative duration is rejected', () => {
	assert.equal(isValidDuration(-1), false)
})

test('a duration that is not a number is rejected', () => {
	// mistyEventTimer returns null for content it cannot parse. null < 0 is
	// false, so the old guard let it through and `delay(null)` resolved
	// immediately — skulling the event the moment it was called.
	assert.equal(isValidDuration(null), false)
	assert.equal(isValidDuration(undefined), false)
	assert.equal(isValidDuration(NaN), false)
})
