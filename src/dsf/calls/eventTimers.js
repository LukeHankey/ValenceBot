import { skullTimer, removeReactPermissions } from './skullTimer.js'
import { setTimeout as delay } from 'timers/promises'
import axios from 'axios'

export const activeTimers = new Map()

export async function startEventTimer({ client, message, eventId, channelName, durationMs, database }) {
	// Validate inputs
	if (!eventId || !message || !client || durationMs < 0) {
		console.error('❌ Invalid parameters for startEventTimer:', { eventId, messageId: message?.id, durationMs })
		return
	}

	const controller = new AbortController()
	const timeout = delay(durationMs, null, { signal: controller.signal })
		.then(async () => {
			client.logger.info(`Skulling and removing reaction permissions from ${channelName} for ${message}`)
			try {
				await skullTimer(client, message, channelName)
				await removeReactPermissions(message, database)
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
	if (!current) return

	current.abortController.abort()

	const message = current.message
	current.client.logger.info(`Username=${message.author.username}, mistyUpdated=${current.mistyUpdated}`)
	// Makes sure to only update the timer once with a mistyUpdate
	// This should also update when the duration comes in as 0
	if (message.author.username === 'Alt1 Tracker' && (!current.mistyUpdated || newDurationMs === 0)) {
		try {
			const content = message.content
			const updatedContent = updateMessageTimestamp(content, newDurationMs)
			const API_URL = process.env.NODE_ENV === 'DEV' ? 'http:localhost:8000' : 'https://api.dsfeventtracker.com'
			const editWebhookResponse = await axios.patch(`${API_URL}/events/webhook/${message.id}`, {
				headers: {
					'Content-Type': 'application/json'
				},
				content: updatedContent
			})
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
				`Skulling and removing reaction permissions from ${current.channelName} for ${current.message}`
			)
			try {
				await skullTimer(current.client, current.message, current.channelName)
				await removeReactPermissions(current.message, current.database)
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
		mistyUpdated: mistyUpdate
	})
}
