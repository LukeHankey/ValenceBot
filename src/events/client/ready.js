/* eslint-disable no-unused-vars */
/* eslint-disable no-octal */
import { updateAllMemberDataBaseRankRoles } from '../../alt1.js'
import {
	updateStockTables,
	scout,
	vScout,
	classVars,
	addedRoles,
	removedRoles,
	removeInactives,
	removeScouters,
	startupRemoveReactionPermissions,
	mistyEventTimer
} from '../../dsf/index.js'
import { sendFact } from '../../valence/index.js'
import { wsClient } from '../../alt1WS.js'
import { activeTimers } from '../../dsf/calls/eventTimers.js'
import { setTimeout as delay } from 'timers/promises'
import cron from 'node-cron'

const initScouterDataBase = async (client, db) => {
	const res = await db.find({}).toArray()
	const scoutTracker = client.database.scoutTracker
	const scouters = await scoutTracker.find({ count: { $gte: 40 } }).toArray()
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
		merchChannel: { channelID, otherChannelID, messages, otherMessages }
	} = await db.findOne(
		{ _id: guildId, merchChannel: { $exists: true } },
		{
			projection: {
				'merchChannel.channelID': 1,
				'merchChannel.otherChannelID': 1,
				'merchChannel.messages': 1,
				'merchChannel.otherMessages': 1
			}
		}
	)

	let durationMs = 0
	for (const eventMsg of [...messages, ...otherMessages]) {
		const controller = new AbortController()
		try {
			durationMs = mistyEventTimer(eventMsg.content)
		} catch (err) {
			channels.errors.send(err)
			continue
		}
		const timeout = delay(durationMs, null, { signal: controller.signal })
		const channelName = eventMsg.content.toLowerCase().startsWith('m') ? 'merch' : 'other'
		const database = messages.some((event) => event.eventID === eventMsg.eventID) ? messages : otherMessages

		const msgChannel = guild.channels.cache.get(channelName === 'merch' ? channelID : otherChannelID)
		const msg = await msgChannel.fetch(eventMsg.messageID)
		activeTimers.set(String(eventMsg.eventID), {
			timeout,
			abortController: controller,
			startTime: Date.now(),
			durationMs,
			client,
			message: msg,
			channelName,
			database
		})
	}

	client.user.setPresence({
		status: 'idle',
		activities: [{ type: 'LISTENING', name: 'DMs for queries regarding the bot.' }]
	})

	cron.schedule('0 10 * * *', async () => {
		sendFact(client)
	})

	// Startup check for dsf messages:
	;(async function () {
		if (process.env.NODE_ENV === 'DEV') return
		for (const channel of ['merch', 'other']) {
			await startupRemoveReactionPermissions(client, db, channel)
		}
	})()

	// DSF Activity Posts //
	cron.schedule('0 */6 * * *', async () => {
		const scoutTracker = client.database.scoutTracker
		await initScouterDataBase(client, db)
		;[scout, vScout].forEach((role) => {
			addedRoles(role, scoutTracker)
			removedRoles(role, scoutTracker)
		})
		removeInactives(client, scout, scoutTracker)
		removeScouters({
			scoutProfiles: [scout, vScout],
			database: db,
			tracker: scoutTracker
		})
		await updateAllMemberDataBaseRankRoles(client, scout)

		// Daily Reset
		if (new Date().getHours() === 0o0 && new Date().getMinutes() === 0o0) {
			updateStockTables(client, db)
			const virtualFisherChannel = client.channels.cache.get('1320188062139158538')
			await virtualFisherChannel.send('<@&1320188185480925204> Dailies!')
		}

		// Weekly reset
		if (new Date().getDay() === 3 && new Date().getHours() === 0o0 && new Date().getMinutes() === 0o0) {
			scout.send()
			vScout.send()
		}

		// Monthly reset
		if (
			new Date().getDate() === 1 &&
			(new Date().getHours() === 0o1 || new Date().getHours() === 0o0) &&
			new Date().getMinutes() === 0o0
		) {
			client.logger.info('Setting lottoSheet to Null')
			await db.updateMany({ gSheet: { $exists: true } }, { $set: { lottoSheet: null } })

			// Send message reminder for DSF Verified Scouter draws
			const dsfOwnersChannel = client.channels.cache.get(channels.dsfOwners.id)
			await dsfOwnersChannel.send('Reminder to roll the giveaway for Verified Scouters!')
		}
	})
}
