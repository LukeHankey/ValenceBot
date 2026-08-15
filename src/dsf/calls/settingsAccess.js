import { logger } from '../../logging.js'

/**
 * Safe reads of the guild settings document.
 *
 * Several places destructured `eventChannel` straight out of a findOne result:
 *
 *     const { eventChannel: { otherChannelID, otherMessages } } = await db.findOne(...)
 *
 * That throws when the document is missing, when the field is missing, or when
 * Mongo is unreachable — and in `ready.js` it threw during client startup, which
 * emits an unhandled 'error' on the Discord client and exits the process. The
 * bot crash-looped through the merchChannel -> eventChannel migration for
 * exactly this reason: new code, documents not yet renamed.
 *
 * Missing settings are a normal state (a fresh guild, a half-finished
 * migration), so they should degrade rather than take the process down.
 */

/**
 * The event channel settings for a guild, with empty defaults.
 *
 * Returns `{ otherChannelID, otherMessages, found }`. `found` is false when
 * there was nothing usable to read, so callers can skip work instead of acting
 * on empty values.
 */
export const getEventChannel = async (collection, guildId) => {
	const empty = { otherChannelID: null, otherMessages: [], found: false }

	let document
	try {
		document = await collection.findOne(
			{ _id: guildId },
			{ projection: { 'eventChannel.otherChannelID': 1, 'eventChannel.otherMessages': 1 } }
		)
	} catch (error) {
		logger.error(`Could not read event channel settings for ${guildId}: ${error.message}`)
		return empty
	}

	const eventChannel = document?.eventChannel
	if (!eventChannel) {
		logger.warn(`No eventChannel settings for guild ${guildId}; skipping event channel work.`)
		return empty
	}

	return {
		otherChannelID: eventChannel.otherChannelID ?? null,
		otherMessages: eventChannel.otherMessages ?? [],
		found: true
	}
}
