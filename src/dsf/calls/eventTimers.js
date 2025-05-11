import { skullTimer, removeReactPermissions } from './skullTimer.js'
import { setTimeout as delay } from 'timers/promises'
import axios from 'axios'

export const activeTimers = new Map()

export async function startEventTimer({ client, message, eventId, channelName, durationMs, database }) {
	const controller = new AbortController()
	const timeout = delay(durationMs, null, { signal: controller.signal })
		.then(async () => {
			await skullTimer(client, message, channelName)
			await removeReactPermissions(message, database)
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

	await timeout
	activeTimers.delete(String(eventId))
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
	if (message.author.username === 'Alt1 Tracker' && !current.mistyUpdated) {
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
			console.error('Failed to edit the webhook', err.response.data.detail)
		}
	}

	const controller = new AbortController()
	const timeout = delay(newDurationMs, null, { signal: controller.signal })
		.then(async () => {
			try {
				activeTimers.delete(String(eventId))
				await skullTimer(current.client, current.message, current.channelName)
				await removeReactPermissions(current.message, current.database)
			} catch (err) {
				console.error(`[${eventId}] ❌ Error in skullTimer or removeReactPermissions:`, err, current)
			}
		})
		.catch((err) => {
			if (err.name !== 'AbortError') console.error(`[${eventId}] ⛔ Updated timer aborted`)
		})

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
