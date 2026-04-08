/* eslint-disable no-unused-vars */
/* eslint-disable no-octal */
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

	const {
		merchChannel: { otherChannelID, otherMessages }
	} = await db.findOne(
		{ _id: guildId, merchChannel: { $exists: true } },
		{
			projection: {
				'merchChannel.otherChannelID': 1,
				'merchChannel.otherMessages': 1
			}
		}
	)

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
					{ $pull: { 'merchChannel.otherMessages': { messageID: eventMsg.messageID } } }
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

		// Daily Reset
		if (new Date().getHours() === 0o0 && new Date().getMinutes() === 0o0) {
			const virtualFisherChannel = client.channels.cache.get('1320188062139158538')
			await virtualFisherChannel.send('<@&1320188185480925204> Dailies!')
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
