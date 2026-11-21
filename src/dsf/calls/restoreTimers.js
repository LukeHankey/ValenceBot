import { getEventChannel } from './settingsAccess.js'
import { startEventTimer } from './eventTimers.js'
import { mistyEventTimer, skullTimer, removeReactPermissions } from '../index.js'

/**
 * On startup, restart the timer of every call still stored for #dsf-calls, or
 * skull it straight away if its time ran out while the bot was down.
 */
export const restoreEventTimers = async (client) => {
	const db = client.database.settings
	const logger = client.logger
	const channels = await client.database.channels
	const guildId = process.env.NODE_ENV === 'DEV' ? '668330890790699079' : '420803245758480405'
	const guild = client.guilds.cache.get(guildId)

	// A guild with no event channel configured gets otherMessages = [], so
	// there is simply nothing to restore.
	const { otherChannelID, otherMessages } = await getEventChannel(db, guildId)

	for (const eventMsg of otherMessages) {
		// null means the stored content is not a call, so there is no duration to
		// restore. Skip it rather than treating it as zero, which would skull an
		// event on startup that may still be running.
		const durationMs = mistyEventTimer(eventMsg.content)
		if (durationMs === null) {
			logger.warn(`Skipping restore for ${eventMsg.messageID}: "${eventMsg.content}" is not a call.`)
			continue
		}

		const elapsedMs = Number.isFinite(eventMsg.time) ? Date.now() - eventMsg.time : 0
		const remainingMs = Math.max(durationMs - elapsedMs, 0)

		const msgChannel = guild.channels.cache.get(otherChannelID)
		if (!msgChannel) continue

		let msg
		try {
			msg = await msgChannel.messages.fetch(eventMsg.messageID)
		} catch (err) {
			// Message was deleted or is otherwise unavailable; remove stale DB entry and continue startup.
			if (err?.code === 10008) {
				await db.updateOne(
					{ _id: guildId },
					{ $pull: { 'eventChannel.otherMessages': { messageID: eventMsg.messageID } } }
				)
				continue
			}
			channels.errors.send(err)
			continue
		}

		if (remainingMs === 0) {
			try {
				await skullTimer(client, msg, 'other')
				await removeReactPermissions(msg, otherMessages)
			} catch (err) {
				channels.errors.send(err)
			}
			continue
		}

		startEventTimer({
			client,
			message: msg,
			eventId: eventMsg.eventID,
			channelName: 'other',
			durationMs: remainingMs,
			database: otherMessages
		})
	}
}
