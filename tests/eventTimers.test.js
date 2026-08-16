import test from 'node:test'
import assert from 'node:assert/strict'

import { buildWebhookEditRequest, expiryEdit, isValidDuration } from '../src/dsf/calls/eventTimers.js'

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

// The webhook posts "JF105 (Called by 5Ftx) | Ends <t:1786886538:R>". Discord
// renders :R> relatively, so once the event is over it reads "3 minutes ago"
// and keeps counting up. Nothing edited it on natural expiry: the strip existed
// but was only reachable through overrideEventTimer, which fires on a Misty
// update or a mod delete, never on an event simply running out.
const webhookMessage = (content, username = 'Alt1 Tracker') => ({ id: '99', content, author: { username } })

const CALL = 'JF105 (Called by 5Ftx) | Ends <t:1786886538:R>'

test('an expired webhook call has its timer stripped', () => {
	const edit = expiryEdit(webhookMessage(CALL))

	assert.equal(edit.body.content, 'JF105 (Called by 5Ftx)')
})

test('the edit targets the message that expired', () => {
	const edit = expiryEdit(webhookMessage(CALL))

	assert.match(edit.url, /\/events\/webhook\/99$/)
})

test('a call from a player is left alone', () => {
	// Only the webhook's own messages can be edited through the API.
	assert.equal(expiryEdit(webhookMessage(CALL, 'someone')), null)
})

test('a webhook message with no timer needs no edit', () => {
	assert.equal(expiryEdit(webhookMessage('JF105 (Called by 5Ftx)')), null)
})

test('a message with no author is left alone', () => {
	assert.equal(expiryEdit({ id: '99', content: CALL }), null)
})
