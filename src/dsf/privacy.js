import { logger } from '../logging.js'

/**
 * Per-user opt-out of message content being read or stored.
 *
 * Discord's privileged intent review asks whether users can opt out of having
 * their message content tracked, and we answer yes. This is that mechanism.
 *
 * Opting out means the bot ignores the user's messages in the event-call
 * channel entirely: nothing is stored, nothing is counted, no reaction is
 * added, and no event timer is started for their call. It is deliberately all
 * or nothing — storing the call text is what makes duplicate detection and the
 * expiry skull work, so there is no halfway position where the call is
 * processed but the text is not held.
 *
 * The flag lives on the scout profile, upserted when someone opts out before
 * ever reporting an event.
 */

export const OPT_OUT_FIELD = 'privacyOptOut'

/**
 * Whether this user has opted out.
 *
 * A read failure counts as opted out. If we cannot tell, the safe direction is
 * to not read or store anything: a call that goes uncounted is a small loss,
 * storing data against someone's stated wishes is not.
 */
export const isOptedOut = async (scoutTracker, userID) => {
	try {
		const profile = await scoutTracker.findOne({ userID }, { projection: { [OPT_OUT_FIELD]: 1 } })
		return profile?.[OPT_OUT_FIELD] === true
	} catch (error) {
		logger.error(`Could not read the privacy setting for ${userID}, treating as opted out: ${error.message}`)
		return true
	}
}

/**
 * Record the user's choice.
 *
 * Opting back in unsets the field rather than storing false, so a profile
 * carries the flag only while it means something.
 */
export const setOptOut = async (scoutTracker, userID, optOut) => {
	const update = optOut ? { $set: { [OPT_OUT_FIELD]: true } } : { $unset: { [OPT_OUT_FIELD]: '' } }

	// Someone can opt out before ever reporting an event, so this may create the
	// document. Give it the shape the rest of the bot expects: the weekly
	// potential-scouters sweep reads `assigned` without checking, and a record
	// holding only a user id and a flag would have thrown there.
	update.$setOnInsert = { count: 0, otherCount: 0, assigned: [], active: 0 }

	await scoutTracker.updateOne({ userID }, update, { upsert: true })
	logger.info(`User ${userID} has opted ${optOut ? 'out of' : 'back in to'} message content tracking.`)
}
