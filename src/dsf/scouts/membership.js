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
/**
 * Fetch one batch, halving it and retrying when Discord does not answer.
 *
 * A production sweep logged "Members didn't arrive in time." for a batch of
 * 100: the gateway does not always deliver a full batch under load. Writing the
 * whole batch off as unknown left those profiles unchecked until the next run,
 * so a batch that fails is split and retried instead. A single id that still
 * fails is genuinely unknown.
 */
const fetchBatch = async (guild, batch, members) => {
	try {
		const fetched = await guild.members.fetch({ user: batch })
		for (const [id, member] of fetched) members.set(id, member)
		return []
	} catch (error) {
		if (batch.length === 1) {
			logger.error(`Could not check guild membership for ${batch[0]}: ${error.message}`)
			return batch
		}

		logger.warn(`Membership check failed for ${batch.length} users (${error.message}); retrying in smaller batches.`)
		const half = Math.ceil(batch.length / 2)
		const failed = []
		for (const smaller of chunkIds(batch, half)) {
			failed.push(...(await fetchBatch(guild, smaller, members)))
		}
		return failed
	}
}

/**
 * The fetched members come back alongside the partition: removing a role needs
 * the member object, and re-fetching one per candidate would repeat work this
 * has already done.
 */
export const partitionByMembership = async (guild, ids) => {
	const members = new Map()
	if (!ids.length) return { present: new Set(), departed: [], members }

	const unknown = new Set()

	for (const batch of chunkIds(ids)) {
		for (const id of await fetchBatch(guild, batch, members)) unknown.add(id)
	}

	const present = new Set(members.keys())
	const departed = ids.filter((id) => !present.has(id) && !unknown.has(id))
	return { present, departed, members }
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

/**
 * Profiles whose Discord roles no longer match their inactive status.
 *
 * Marking a profile inactive never touched the roles, so someone could sit at
 * `active: 0` while still holding Scouter. This covers the profiles this run
 * marked and the backlog left by earlier runs in one rule.
 *
 * Only an explicit 0 qualifies. selectInactiveProfiles can afford to read a
 * missing `active` field as not-active because the cost is skipping a profile;
 * here the cost is taking the roles off a working scouter whose document
 * predates the flag.
 */
export const selectStrippable = (profiles) =>
	profiles.filter((profile) => profile.active === 0 && (profile.assigned ?? []).length > 0)

/**
 * Roles the bot can actually take off someone.
 *
 * Discord checks the position of the *role being changed*, not the target's own
 * highest role, so the only questions are whether the role sits below the bot
 * and whether an integration owns it. Filtering once per run turns what would
 * be a 403 per member into a single warning.
 */
export const strippableRoles = (roles) =>
	roles.filter((role) => {
		if (role.managed) {
			logger.warn(`Cannot remove ${role.name}: the role is managed by an integration.`)
			return false
		}

		if (!role.editable) {
			logger.warn(`Cannot remove ${role.name}: the role sits above the bot's highest role.`)
			return false
		}

		return true
	})

const UNKNOWN_MEMBER = 10007
const MISSING_PERMISSIONS = 50013

const STRIP_REASON = 'Scouter profile marked inactive'

/**
 * Take the scouter roles off members whose profile is inactive.
 *
 * Only what Discord actually accepted is pulled from `assigned`, so a removal
 * that fails leaves the database agreeing with the guild rather than claiming a
 * role is gone when it is not.
 *
 * Nobody who is absent is written to. A departed member's roles left with them,
 * and `assigned` is the record of what they held if they return; a member whose
 * fetch failed is unknown rather than gone, the same way partitionByMembership
 * treats them.
 */
export const stripInactiveRoles = async ({ guild, roles, profiles, scoutTracker }) => {
	const candidates = selectStrippable(profiles)
	if (!candidates.length) return []

	const manageable = strippableRoles(roles)
	if (!manageable.length) return []

	const { members } = await partitionByMembership(
		guild,
		candidates.map((profile) => profile.userID)
	)

	const entries = []

	for (const profile of candidates) {
		const member = members.get(profile.userID)
		if (!member) continue

		const removed = []

		for (const role of manageable) {
			if (!member.roles.cache.has(role.id)) continue

			try {
				await member.roles.remove(role, STRIP_REASON)
				removed.push(role)
			} catch (error) {
				if (error.code === UNKNOWN_MEMBER) {
					logger.warn(`${profile.userID} left before their roles could be removed.`)
					break
				}

				const detail = error.code === MISSING_PERMISSIONS ? 'missing permissions' : error.message
				logger.error(`Could not remove ${role.name} from ${profile.userID}: ${detail}`)
			}
		}

		if (!removed.length) continue

		await scoutTracker.updateOne({ userID: profile.userID }, { $pullAll: { assigned: removed.map((role) => role.id) } })

		entries.push({
			author: profile.author,
			userID: profile.userID,
			reason: `role(s) removed: ${removed.map((role) => role.name).join(', ')}`,
			isScouter: true
		})
	}

	if (entries.length) logger.info(`Removed scouter roles from ${entries.length} inactive profile(s)`)
	return entries
}

/**
 * Split a report by who needs to see it.
 *
 * Someone holding a scouter role going inactive is a staffing matter, so it
 * goes to the owners channel — as the old sweep did through logRemovedScouts.
 * Everyone else is routine and belongs in the log channel.
 */
export const splitReportAudience = (entries) => ({
	owners: entries.filter((entry) => entry.isScouter),
	general: entries.filter((entry) => !entry.isScouter)
})
