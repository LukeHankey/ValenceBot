import { skullTimer, removeReactPermissions } from './skullTimer.js'
import { setTimeout as delay } from 'timers/promises'
import axios from 'axios'

export const activeTimers = new Map()

const apiUrl = () => (process.env.NODE_ENV === 'DEV' ? 'http://localhost:8000' : 'https://api.dsfeventtracker.com')

/**
 * The parts of the request that edits an event's webhook message.
 *
 * The API key belongs in the headers, which is axios' *third* argument. It used
 * to be passed inside the second — the request body — so it was serialised into
 * the JSON and never sent as a header, and require_bot_api_key rejected every
 * edit.
 */
export const buildWebhookEditRequest = (messageId, content) => ({
	url: `${apiUrl()}/events/webhook/${messageId}`,
	body: { content },
	config: {
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': process.env.BOT_API_KEY
		}
	}
})

/**
 * Whether a duration can be timed.
 *
 * mistyEventTimer returns null for content it cannot parse. `null < 0` is
 * false, so a null slipped past the old check and `delay(null)` resolved
 * straight away, skulling the event as soon as it was called.
 */
export const isValidDuration = (durationMs) => Number.isFinite(durationMs) && durationMs >= 0

/** The webhook posts under this name; only its own messages can be edited. */
const WEBHOOK_AUTHOR = 'Alt1 Tracker'

/**
 * The edit that removes the countdown from a call that has just expired, or
 * null when there is nothing to do.
 *
 * The webhook posts "JF105 (Called by 5Ftx) | Ends <t:1786886538:R>". Discord
 * renders `:R>` relatively, so once the event is over the message reads "3
 * minutes ago" and keeps counting up for as long as it exists. Stripping the
 * timer was already written, but only reachable through overrideEventTimer —
 * a Misty update or a mod delete — so an event that simply ran out kept its
 * stale countdown next to the skull.
 */
export const expiryEdit = (message) => {
	if (message?.author?.username !== WEBHOOK_AUTHOR) return null

	const content = updateMessageTimestamp(message.content, 0)
	if (content === message.content) return null

	return buildWebhookEditRequest(message.id, content)
}

/**
 * Remove the countdown from an expired call.
 *
 * Never throws: the event has ended either way, and a failed tidy-up should not
 * take out skulling or the reaction permissions cleanup.
 */
const stripExpiredTimer = async (message) => {
	const edit = expiryEdit(message)
	if (!edit) return

	try {
		await axios.patch(edit.url, edit.body, edit.config)
	} catch (error) {
		console.error('Failed to strip the expired timer:', error.response?.data?.detail || error.message)
	}
}

export async function startEventTimer({ client, message, eventId, channelName, durationMs, database }) {
	// Validate inputs
	if (!eventId || !message || !client || !isValidDuration(durationMs)) {
		console.error('❌ Invalid parameters for startEventTimer:', { eventId, messageId: message?.id, durationMs })
		return
	}

	const controller = new AbortController()
	const timeout = delay(durationMs, null, { signal: controller.signal })
		.then(async () => {
			client.logger.info(
				`Skulling and removing reaction permissions from ${channelName} for message "${message.content}" by ${message.author.username}`
			)
			try {
				await skullTimer(client, message, channelName)
				await removeReactPermissions(message, database)
				await stripExpiredTimer(message)
			} catch (err) {
				console.error(`[${eventId}] ❌ Error in timer completion:`, err)
			} finally {
				activeTimers.delete(String(eventId))
			}
		})
		.catch((err) => {
			if (err.name === 'AbortError') {
				console.log('Timer was aborted')
			} else {
				console.error('Timer error', err)
			}
		})

	activeTimers.set(String(eventId), {
		timeout,
		abortController: controller,
		startTime: Date.now(),
		durationMs,
		client,
		message,
		channelName,
		database,
		mistyUpdated: false
	})
	client.logger.info(`Adding ${message.content} from ${message.author.username} to activeTimers with mistyUpdated=false.`)

	await timeout
	client.logger.info(`Event ${eventId} timer completed`)
}

function updateMessageTimestamp(content, newDurationMs) {
	if (newDurationMs > 0) {
		const adjustedTimestamp = parseInt(Date.now() / 1000 + newDurationMs / 1000)
		return content.replace(/<t:\d+:R>/, `<t:${adjustedTimestamp}:R>`)
	} else {
		return content.replace(/\s\|.*/, '')
	}
}

export async function overrideEventTimer(eventId, newDurationMs, mistyUpdate = false) {
	const current = activeTimers.get(String(eventId))
	if (!current) {
		console.warn(`[${eventId}] ⚠️ Attempted to override non-existent timer`)
		return
	}

	// Prevent race conditions by checking if timer is already being updated
	if (current.updating) {
		console.warn(`[${eventId}] ⚠️ Timer update already in progress, skipping`)
		return
	}

	// Mark as updating to prevent race conditions
	current.updating = true
	current.abortController.abort()

	const message = current.message
	current.client.logger.info(`Username=${message.author.username}, mistyUpdated=${current.mistyUpdated}`)
	// Makes sure to only update the timer once with a mistyUpdate
	// This should also update when the duration comes in as 0
	if (message.author.username === 'Alt1 Tracker' && (!current.mistyUpdated || newDurationMs === 0)) {
		try {
			const content = message.content
			const updatedContent = updateMessageTimestamp(content, newDurationMs)
			const { url, body, config } = buildWebhookEditRequest(message.id, updatedContent)
			const editWebhookResponse = await axios.patch(url, body, config)
			if (editWebhookResponse.status !== 200) {
				console.log('Did not receive the correct response')
			} else {
				console.log('Event editted successfully')
			}
		} catch (err) {
			console.error('Failed to edit the webhook', err.response?.data?.detail || err.message)
		}
	}

	if (newDurationMs === 0) {
		try {
			await skullTimer(current.client, current.message, current.channelName)
			await removeReactPermissions(current.message, current.database)
		} catch (err) {
			console.error(`[${eventId}] ❌ Error in completion for immediate end:`, err)
		}
		activeTimers.delete(String(eventId))
		return
	}

	const controller = new AbortController()
	const timeout = delay(newDurationMs, null, { signal: controller.signal })
		.then(async () => {
			current.client.logger.info(
				`Skulling and removing reaction permissions from ${current.channelName} for message "${current.message.content}" by ${current.message.author.username}`
			)
			try {
				await skullTimer(current.client, current.message, current.channelName)
				await removeReactPermissions(current.message, current.database)
				await stripExpiredTimer(current.message)
			} catch (err) {
				console.error(`[${eventId}] ❌ Error in updated timer completion:`, err)
			} finally {
				activeTimers.delete(String(eventId))
			}
		})
		.catch((err) => {
			if (err.name === 'AbortError') {
				console.log('Timer was aborted')
			} else {
				console.error(`[${eventId}] ⛔ Updated timer aborted`)
			}
		})

	current.client.logger.info(`Updating the activeTimer from ${current.durationMs}ms to ${newDurationMs}ms.`)
	activeTimers.set(String(eventId), {
		...current,
		timeout,
		abortController: controller,
		startTime: Date.now(),
		durationMs: newDurationMs,
		message,
		mistyUpdated: mistyUpdate,
		updating: false
	})
}
