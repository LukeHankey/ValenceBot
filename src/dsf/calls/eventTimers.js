import { skullTimer, removeReactPermissions } from './skullTimer.js'
import { setTimeout as delay } from 'timers/promises'

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
		database
	})

	await timeout
	activeTimers.delete(String(eventId))
}

function updateMessageTimestamp(content, currentDurationMs, newDurationMs) {
	const match = content.match(/<t:(\d+):R>/)
	if (!match) return content // No timestamp found, return as-is

	const originalTimestamp = parseInt(match[1], 10)

	const adjustedTimestamp = parseInt((originalTimestamp - currentDurationMs / 1000 + newDurationMs / 1000).toString())

	return content.replace(/<t:\d+:R>/, `<t:${adjustedTimestamp}:R>`)
}

export async function overrideEventTimer(eventId, newDurationMs) {
	const current = activeTimers.get(String(eventId))
	if (!current) return

	current.abortController.abort()

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

	const content = current.message.content
	await current.message.edit({ content: updateMessageTimestamp(content, current.durationMs, newDurationMs) })

	activeTimers.set(String(eventId), {
		...current,
		timeout,
		abortController: controller,
		startTime: Date.now(),
		durationMs: newDurationMs
	})
}
