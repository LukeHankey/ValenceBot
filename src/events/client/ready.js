/* eslint-disable no-unused-vars */
/* eslint-disable no-octal */
import { codeBlock } from 'discord.js'
import {
	buildInactiveReport,
	markDepartedInactive,
	partitionByMembership,
	planReportDelivery,
	selectInactiveProfiles,
	splitReportAudience
} from '../../dsf/scouts/membership.js'
import { getEventChannel } from '../../dsf/calls/settingsAccess.js'
import { updateAllMemberDataBaseRankRoles } from '../../alt1.js'
import {
	scout,
	vScout,
	classVars,
	addedRoles,
	removedRoles,
	mistyEventTimer,
	skullTimer,
	removeReactPermissions
} from '../../dsf/index.js'
import { sendFact } from '../../valence/index.js'
import { wsClient } from '../../alt1WS.js'
import { startEventTimer } from '../../dsf/calls/eventTimers.js'
import cron from 'node-cron'

const initScouterDataBase = async (client, db) => {
	const res = await db.find({}).toArray()
	const scoutTracker = client.database.scoutTracker
	const scouters = await scoutTracker
		.find({
			$or: [
				{
					$expr: {
						$gte: [
							{
								$sum: [
									'$count',
									'$otherCount',
									'$alt1.merchantCount',
									'$alt1First.merchantCount',
									'$alt1.otherCount',
									'$alt1First.otherCount'
								]
							},
							100
						]
					}
				},
				{ 'assigned.0': { $exists: true } }
			]
		})
		.toArray()
	await classVars(scout, 'Deep Sea Fishing', res, client, scouters)
	await classVars(vScout, 'Deep Sea Fishing', res, client, scouters)
}

export default async (client) => {
	await client.database.connect()

	const db = client.database.settings
	const logger = client.logger
	await initScouterDataBase(client, db)
	logger.info('Ready!')
	const channels = await client.database.channels
	wsClient.connect()

	const guildId = process.env.NODE_ENV === 'DEV' ? '668330890790699079' : '420803245758480405'
	const guild = client.guilds.cache.get(guildId)

	// No early return: startup continues to setPresence and the cron schedules
	// below even when a guild has no event channel configured. otherMessages
	// defaults to [], so the restore loop simply has nothing to do.
	const { otherChannelID, otherMessages } = await getEventChannel(db, guildId)

	for (const eventMsg of otherMessages) {
		let durationMs = 0
		try {
			durationMs = mistyEventTimer(eventMsg.content)
		} catch (err) {
			channels.errors.send(err)
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

	client.user.setPresence({
		status: 'idle',
		activities: [{ type: 'LISTENING', name: 'DMs for queries regarding the bot.' }]
	})

	cron.schedule('0 10 * * *', async () => {
		sendFact(client)
	})

	// DSF Activity Posts //
	cron.schedule('0 */6 * * *', async () => {
		const scoutTracker = client.database.scoutTracker
		await initScouterDataBase(client, db)
		;[scout, vScout].forEach(async (role) => {
			await addedRoles(role, scoutTracker)
			await removedRoles(role, scoutTracker)
		})
		await updateAllMemberDataBaseRankRoles(client, scout)

		// Reconcile profiles against who is actually in the guild, and against who
		// has gone quiet. `active` was only ever set to 1, so nothing had marked a
		// profile inactive since #196 removed the old sweep. Nothing is deleted:
		// that sweep dropped profiles outright after six months, throwing away the
		// record of what someone did.
		try {
			const channels = await client.database.channels
			const activeProfiles = await scoutTracker.find({ active: 1 }).toArray()
			const byId = new Map(activeProfiles.map((profile) => [profile.userID, profile]))

			const { departed } = await partitionByMembership(
				await scout.guild,
				activeProfiles.map((profile) => profile.userID)
			)
			await markDepartedInactive(scoutTracker, departed)

			const stillPresent = activeProfiles.filter((profile) => !departed.includes(profile.userID))
			const quiet = selectInactiveProfiles(stillPresent)
			if (quiet.length) {
				await scoutTracker.updateMany(
					{ userID: { $in: quiet.map((profile) => profile.userID) }, active: 1 },
					{ $set: { active: 0, inactiveSince: new Date() } }
				)
			}

			const entries = [
				...departed.map((userID) => ({
					author: byId.get(userID)?.author ?? 'unknown',
					userID,
					reason: 'left the server',
					isScouter: (byId.get(userID)?.assigned ?? []).length > 0
				})),
				...quiet.map((profile) => ({
					author: profile.author,
					userID: profile.userID,
					reason: `no activity since ${new Date(profile.lastTimestamp).toISOString().slice(0, 10)}`,
					isScouter: (profile.assigned ?? []).length > 0
				}))
			]

			// Scouters going inactive is a staffing matter, so they go to the
			// owners channel; everyone else is routine and goes to the log
			// channel. Both are chunked to Discord's message limit, and a large
			// backlog goes as one attachment rather than dozens of messages.
			const { owners, general } = splitReportAudience(entries)

			for (const [channel, group, label] of [
				[channels.dsfOwners, owners, 'scouter'],
				[channels.logs, general, 'profile']
			]) {
				const delivery = planReportDelivery(buildInactiveReport(group))

				if (delivery.mode === 'messages') {
					for (const chunk of delivery.chunks) {
						await channel.send(`${group.length} ${label}(s) marked inactive.\n${codeBlock(chunk)}`)
					}
				} else if (delivery.mode === 'file') {
					await channel.send(`${group.length} ${label}(s) marked inactive. Full list attached.`, {
						files: [{ attachment: Buffer.from(delivery.content, 'utf8'), name: `inactive-${label}s.txt` }]
					})
				}
			}
		} catch (error) {
			client.logger.error(`Could not reconcile scouter profiles: ${error.message}`)
		}

		// Daily Reset
		if (new Date().getHours() === 0o0 && new Date().getMinutes() === 0o0) {
			const virtualFisherChannel = client.channels.cache.get('1320188062139158538')
			await virtualFisherChannel.send('<@&1320188185480925204> Dailies!')
		}

		// Weekly reset
		if (new Date().getDay() === 3 && new Date().getHours() === 0o0 && new Date().getMinutes() === 0o0) {
			await scout.send()
			await vScout.send()
		}

		// Monthly reset
		if (
			new Date().getDate() === 1 &&
			(new Date().getHours() === 0o1 || new Date().getHours() === 0o0) &&
			new Date().getMinutes() === 0o0
		) {
			client.logger.info('Setting lottoSheet to Null')
			await db.updateMany({ gSheet: { $exists: true } }, { $set: { lottoSheet: null } })
		}
	})
}
