import { logger } from '../../logging.js'
import { splitMessage } from '../../functions.js'

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

/**
 * How long a profile may be quiet before it is marked inactive.
 *
 * These are the thresholds the bot used before #196 removed the sweep: a plain
 * profile with almost no activity goes quiet quickly, while someone who holds a
 * scouter role is given a quarter before being counted out.
 */
const IDLE_DAYS = 31
const SCOUTER_IDLE_DAYS = 90
const LOW_ACTIVITY_TOTAL = 10

const DAY_MS = 1000 * 60 * 60 * 24

const totalActivity = (profile) =>
	(profile.count ?? 0) +
	(profile.otherCount ?? 0) +
	(profile.alt1?.merchantCount ?? 0) +
	(profile.alt1?.otherCount ?? 0) +
	(profile.alt1First?.merchantCount ?? 0) +
	(profile.alt1First?.otherCount ?? 0)

/**
 * Profiles that have gone quiet long enough to be marked inactive.
 *
 * Nothing is ever deleted. The old sweep removed profiles outright once they
 * had been inactive for six months, which threw away the record of what someone
 * did; marking them is enough, and the counts are still there if they return.
 */
export const selectInactiveProfiles = (profiles, now = Date.now()) =>
	profiles.filter((profile) => {
		if (profile.active !== 1) return false

		const idleMs = now - (profile.lastTimestamp ?? 0)
		const isScouter = (profile.assigned ?? []).length > 0

		if (isScouter) return idleMs >= SCOUTER_IDLE_DAYS * DAY_MS

		return idleMs >= IDLE_DAYS * DAY_MS && totalActivity(profile) < LOW_ACTIVITY_TOTAL
	})

/**
 * The report for the log channel, split to fit Discord's 2000 character limit.
 *
 * A backlog of profiles marked in one run is easily longer than a single
 * message, which is why this returns chunks rather than one string.
 */
export const buildInactiveReport = (entries) => {
	if (!entries.length) return []

	const lines = entries.map((entry) => `${entry.author} - ${entry.userID}: ${entry.reason}`)
	return splitMessage(lines.join('\n'), { maxLength: 1900 })
}

/**
 * How many messages are worth posting before switching to an attachment.
 *
 * The first run after a long gap has a backlog: 2362 profiles is 55 chunks,
 * and posting those one by one would flood the log channel and risk a rate
 * limit. Past this many, the whole report goes as a single file instead.
 */
const MAX_REPORT_MESSAGES = 5

export const planReportDelivery = (chunks) => {
	if (!chunks.length) return { mode: 'none' }
	if (chunks.length <= MAX_REPORT_MESSAGES) return { mode: 'messages', chunks }

	return { mode: 'file', content: chunks.join('\n'), chunkCount: chunks.length }
}
