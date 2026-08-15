import { logger } from '../../logging.js'

/**
 * Guild membership checks for scouter profiles.
 *
 * ScoutTracker keeps a profile forever, but people leave. Two things went wrong
 * because nothing reconciled the two:
 *
 *  - the weekly "potential scouters" embed listed anyone whose counts qualified,
 *    including people who had left, so the same departed users appeared every
 *    week. checkRolesAdded/checkRolesRemoved already fetch members and so skip
 *    them; only the embed path was blind to it.
 *  - `active` was written once at profile creation and never updated, so no
 *    profile had ever been marked inactive.
 *
 * Fetching by explicit user ids does not need the privileged GuildMembers
 * intent (that is only required to request the *whole* member list), so this
 * works with the bot's current intents.
 */

/** Discord accepts at most 100 user ids per member request. */
const MAX_IDS_PER_FETCH = 100

export const chunkIds = (ids, size = MAX_IDS_PER_FETCH) => {
	const batches = []
	for (let i = 0; i < ids.length; i += size) batches.push(ids.slice(i, i + size))
	return batches
}

/**
 * Split ids into those still in the guild and those who have left.
 *
 * A batch that fails is treated as unknown rather than departed: marking
 * profiles inactive because Discord rate limited us would lose data that is
 * expensive to reconstruct.
 */
export const partitionByMembership = async (guild, ids) => {
	const present = new Set()
	if (!ids.length) return { present, departed: [] }

	const unknown = new Set()

	for (const batch of chunkIds(ids)) {
		try {
			const members = await guild.members.fetch({ user: batch })
			for (const id of members.keys()) present.add(id)
		} catch (error) {
			logger.error(`Could not check guild membership for ${batch.length} users: ${error.message}`)
			for (const id of batch) unknown.add(id)
		}
	}

	const departed = ids.filter((id) => !present.has(id) && !unknown.has(id))
	return { present, departed }
}

/**
 * Mark departed users' profiles inactive, keeping their stats.
 *
 * Profiles are never deleted: the counts are a record of what someone did, and
 * they matter if the person comes back.
 */
export const markDepartedInactive = async (scoutTracker, departedIds) => {
	if (!departedIds.length) return 0

	const result = await scoutTracker.updateMany(
		{ userID: { $in: departedIds }, active: 1 },
		{ $set: { active: 0, leftAt: new Date() } }
	)

	if (result.modifiedCount) logger.info(`Marked ${result.modifiedCount} scouter profile(s) inactive: no longer in guild`)
	return result.modifiedCount
}
