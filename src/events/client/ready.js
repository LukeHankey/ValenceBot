/* eslint-disable no-unused-vars */
/* eslint-disable no-octal */
import { codeBlock } from 'discord.js'
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
import { sendFact, updateRoles } from '../../valence/index.js'
import cron from 'node-cron'

export default async (client) => {
	await client.database.connect()

	const db = client.database.settings
	const users = client.database.users
	const logger = client.logger
	logger.info('Ready!')
	const channels = await client.database.channels

	client.user.setPresence({
		status: 'idle',
		activities: [{ type: 'LISTENING', name: 'DMs for queries regarding the bot.' }]
	})

	const formatTemplate = (data) => {
		const headers = { clanMate: 'Name', clanRank: 'Rank', totalXP: 'Total XP', kills: 'Kills' }
		let dataChanged = data[0].potentialNewNames.map((o) => {
			return { clanMate: o.clanMate, clanRank: o.clanRank, totalXP: o.totalXP, kills: o.kills }
		})
		dataChanged.splice(0, 0, headers)

		const padding = (str, start = false, max) => {
			if (start) {
				str = str.padStart(str.length, '| ')
			}
			const strMax = str.padEnd(max, ' ')
			return strMax.concat(' | ')
		}
		if (!dataChanged.length) return
		dataChanged = dataChanged.map((profile) => {
			return `${padding(profile.clanMate, true, Math.max(...dataChanged.map((el) => el.clanMate.length)))}${padding(
				profile.clanRank,
				false,
				Math.max(...dataChanged.map((el) => el.clanRank.length))
			)}${padding(profile.totalXP, false, Math.max(...dataChanged.map((el) => el.totalXP.length)))}${padding(
				profile.kills,
				false,
				Math.max(...dataChanged.map((el) => el.kills.length))
			)}`
		})
		dataChanged.splice(0, 0, `'${data[0].clanMate}' might have changed names to one of these potential new names.\n`)
		dataChanged.push(
			' ',
			'Reactions:\n✅ Takes the primary suggestion.\n❌ Not changed names or none match.\n📝 Pick another suggestion.'
		)
		return dataChanged.join('\n')
	}

	const postData = async (data) => {
		if (!data) return
		const valenceChannels = await db.findOne({ _id: '472448603642920973' }, { projection: { channels: 1 } })
		const valenceAdminChannel = client.channels.cache.get(valenceChannels.channels.adminChannel)
		const messageSend = await valenceAdminChannel.send({ content: `${codeBlock(formatTemplate(data))}` })
		await messageSend.react('✅')
		await messageSend.react('❌')
		await messageSend.react('📝')

		await db.updateOne(
			{ _id: messageSend.guild.id },
			{
				$addToSet: {
					nameChange: {
						messageID: messageSend.id,
						data
					}
				}
			}
		)
	}

	cron.schedule('0 10 * * *', async () => {
		sendFact(client)
	})

	const stream = users.watch({ fullDocument: 'updateLookup' })
	stream.on('change', (next) => {
		if (next.updateDescription) {
			const updated = next.updateDescription.updatedFields
			if ('potentialNewNames' in updated) {
				postData([next.fullDocument])
			}
		}
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
		removeInactives(scout, db, scoutTracker)
		removeScouters({
			scoutProfiles: [scout, vScout],
			database: db,
			tracker: scoutTracker
		})

		// Daily Reset
		if (new Date().getHours() === 0o0 && new Date().getMinutes() === 0o0) {
			updateStockTables(client, db)
		}

		// Weekly reset
		if (new Date().getDay() === 3 && new Date().getHours() === 0o0 && new Date().getMinutes() === 0o0) {
			scout.send()
			vScout.send()
			const allUsers = await users.find({}).toArray()
			// Flood the cache to make only 1 API request
			const server = client.guilds.cache.get('472448603642920973')
			await server.members.fetch()

			let index = 0
			const interval = setInterval(() => {
				updateRoles(client, allUsers[index], server, channels, users)
				index++

				if (index === allUsers.length) {
					clearInterval(interval)
					server.members.cache.clear()
				}
			}, 1000)
		}

		// Monthly reset + 1 day
		if (
			new Date().getDate() === 2 &&
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
