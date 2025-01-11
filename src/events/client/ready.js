/* eslint-disable no-unused-vars */
/* eslint-disable no-octal */
import {
	updateStockTables,
	scout,
	vScout,
	classVars,
	addedRoles,
	removedRoles,
	removeInactives,
	removeScouters,
	startupRemoveReactionPermissions
} from '../../dsf/index.js'
import { sendFact } from '../../valence/index.js'
import cron from 'node-cron'

export default async (client) => {
	await client.database.connect()

	const db = client.database.settings
	const logger = client.logger
	logger.info('Ready!')
	const channels = await client.database.channels

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
		const res = await db.find({}).toArray()
		const scoutTracker = client.database.scoutTracker
		const scouters = await scoutTracker.find({ count: { $gte: 40 } }).toArray()
		await classVars(scout, 'Deep Sea Fishing', res, client, scouters)
		await classVars(vScout, 'Deep Sea Fishing', res, client, scouters)
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

		// Reset Info Count back to 0 to allow use of command
		await db
			.find({})
			.toArray()
			.then((r) => {
				r = r.filter((doc) => doc.resetInfoCount >= 0)
				for (const doc in r) {
					if (r[doc].resetInfoCount === 1 && r[doc].resetInfoTime < r[doc].resetInfoTime + 86400000) {
						return db.updateOne(
							{ serverName: r[doc].serverName },
							{
								$set: {
									resetInfoCount: 0
								}
							}
						)
					}
				}
			})
	})
}
