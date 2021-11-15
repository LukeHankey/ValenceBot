/* eslint-disable no-unused-vars */
/* eslint-disable no-octal */
import { MongoCollection } from '../../DataBase.js'
import { msCalc, doubleDigits, nextDay } from '../../functions.js'
import { scout, vScout, classVars, addedRoles, removedRoles, removeInactives } from '../../dsf/scouts/scouters.js'
import { removeButtons } from '../../dsf/merch/merchFunctions.js'
import { Formatters } from 'discord.js'
import sendFact from '../../valence/dailyFact.js'
import updateRoles from '../../valence/clanData.js'
import skullTimer from '../../dsf/merch/merchChannel/skullTimer.js'
import updateStockTables from '../../dsf/stockTables.js'
import cron from 'node-cron'
import os from 'os'

const db = new MongoCollection('Settings')
const users = new MongoCollection('Users')

export default async client => {
	console.log('Ready!')
	const channels = await db.channels

	client.user.setPresence({
		status: 'idle',
		activities: [{ type: 'LISTENING', name: 'DMs for queries regarding the bot.' }]
	})

	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

	setInterval(async () => {
		const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`

		const memoryData = process.memoryUsage()
		const memoryArr = []

		const memoryUsage = {
			rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
			heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
			heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
			external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
			osTotalMemory: `${formatMemoryUsage(os.totalmem())} -> Total memory`,
			osFreeMemory: `${formatMemoryUsage(os.freemem())} -> Free memory`
		}

		for (const mem in memoryUsage) {
			memoryArr.push(`${mem}: ${memoryUsage[mem]}\n`)
		}

		channels.logs.send(`${Formatters.codeBlock(memoryArr.join(''))}`)
	}, 3.6e+6)

	const formatTemplate = (data) => {
		const headers = { clanMate: 'Name', clanRank: 'Rank', totalXP: 'Total XP', kills: 'Kills' }
		let dataChanged = data[0].potentialNewNames.map(o => { return { clanMate: o.clanMate, clanRank: o.clanRank, totalXP: o.totalXP, kills: o.kills } })
		dataChanged.splice(0, 0, headers)

		const padding = (str, start = false, max) => {
			if (start) {
				str = str.padStart(str.length, '| ')
			}
			const strMax = str.padEnd(max, ' ')
			return strMax.concat(' | ')
		}
		dataChanged = dataChanged.map((profile) => {
			return `${padding(profile.clanMate, true, Math.max(...(dataChanged.map(el => el.clanMate.length))))}${padding(profile.clanRank, false, Math.max(...(dataChanged.map(el => el.clanRank.length))))}${padding(profile.totalXP, false, Math.max(...(dataChanged.map(el => el.totalXP.length))))}${padding(profile.kills, false, Math.max(...(dataChanged.map(el => el.kills.length))))}`
		})
		dataChanged.splice(0, 0, `'${data[0].clanMate}' might have changed names to one of these potential new names.\n`)
		dataChanged.push(' ', 'Reactions:\n✅ Takes the primary suggestion.\n❌ Not changed names or none match.\n📝 Pick another suggestion.')
		return dataChanged.join('\n')
	}

	const postData = async (data) => {
		const valenceChannels = await db.collection.findOne({ _id: '472448603642920973' }, { projection: { channels: 1 } })
		const valenceAdminChannel = client.channels.cache.get(valenceChannels.channels.adminChannel)
		const messageSend = await valenceAdminChannel.send(`${Formatters.codeBlock(formatTemplate(data))}`)
		await messageSend.react('✅')
		await messageSend.react('❌')
		await messageSend.react('📝')

		await db.collection.updateOne({ _id: messageSend.guild.id }, {
			$addToSet: {
				nameChange: {
					messageID: messageSend.id,
					data
				}
			}
		})
	}

	cron.schedule('0 10 * * *', async () => {
		sendFact(client)
	})

	// Citadel Server Reminders //
	await db.collection.find({}).toArray().then(r => {
		for (const document in r) {
			if (!r[document].citadel_reset_time) return
			cron.schedule('*/5 * * * *', async () => {
				const today = new Date()
				const todayNum = today.getUTCDay()
				const todayStr = days[todayNum]
				// eslint-disable-next-line no-shadow
				const newDates = function (days, hours, minutes, timer) {
					const time = msCalc(days, doubleDigits(hours), doubleDigits(minutes)) + timer
					return new Date(time).toUTCString()
				}
				await db.collection.find({}).toArray().then(res => {
					const dayNum = days.indexOf(res[document].citadel_reset_time.day)
					const resetString = nextDay(dayNum).toUTCString().split(' ')
					resetString.splice(4, 1, `${res[document].citadel_reset_time.hour}:${res[document].citadel_reset_time.minute}:00`)
					const resetms = Date.parse(resetString.join(' '))

					const reminders = res[document].citadel_reset_time.reminders
					for (const remDoc in reminders) {
						if (reminders[remDoc].dayReset === 'reset') {
							const newDate = newDates(reminders[remDoc].dayResetPlus, reminders[remDoc].hourResetPlus, reminders[remDoc].minResetPlus, resetms)
							const dateDays = newDate.split(' ')[0].slice(0, 3)
							const dateHours = newDate.split(' ')[4].slice(0, 2)
							const dateMins = newDate.split(' ')[4].slice(3, 5)

							if (dateDays === todayStr.substr(0, 3)) {
								if (today.getUTCHours() === +dateHours) {
									if (+dateMins <= today.getUTCMinutes() && today.getUTCMinutes() < (+dateMins + 5)) {
										client.channels.cache.get(res[document].citadel_reset_time.reminders[remDoc].channel).send(`${res[document].citadel_reset_time.reminders[remDoc].message}`)
									}
								}
							}
						} else if (res[document].citadel_reset_time.day === todayNum || res[document].citadel_reset_time.day === todayStr || res[document].citadel_reset_time.day === todayStr.substr(0, 3)) {
							if (today.getUTCHours() === res[document].citadel_reset_time.hour) {
								if (res[document].citadel_reset_time.minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].citadel_reset_time.minute + 5)) {
									client.channels.cache.get(res[document].citadel_reset_time.reminders[remDoc].channel).send(`${res[document].citadel_reset_time.reminders[remDoc].message}\`\`\`You can also help out with setting the Citadel Reset Time since it changes almost every single week! Use the following command to let your Clan Admins know the next Citadel Reset:\n\n${res[document].prefix}citadel reset info <days> <hours> <minutes> <image (optional)>\n\nExample:\n${res[document].prefix}citadel reset info 6 22 42\`\`\``)
								}
							}
						}
					}
				})
				// Will continue to be on/off and won't switch until the bot resets
			}, { scheduled: r[document].citadel_reset_time.scheduled })
		}
	})

	const stream = users.collection.watch({ fullDocument: 'updateLookup' })
	stream.on('change', next => {
		if (next.updateDescription) {
			const updated = next.updateDescription.updatedFields
			if ('potentialNewNames' in updated) {
				postData([next.fullDocument])
			}
		}
	});

	// If node cycling:
	(async function () {
		if (process.env.NODE_ENV === 'DEV') return
		const { merchChannel: { channelID } } = await db.collection.findOne({ _id: '420803245758480405' }, { projection: { merchChannel: { channelID: 1 } } })
		const merchantChannel = client.channels.cache.get(channelID)
		let message = await merchantChannel.messages.fetch({ limit: 1 })
		message = message.first()
		skullTimer(message, db)
	})()

	// DSF Activity Posts //
	cron.schedule('0 */6 * * *', async () => {
		const res = await db.collection.find({}).toArray()
		await classVars(scout, 'Deep Sea Fishing', res, client)
		await classVars(vScout, 'Deep Sea Fishing', res, client);

		[scout, vScout].forEach(role => {
			addedRoles(role, db)
			removedRoles(role, db)
		})
		removeInactives(scout, db)
		await removeButtons(client, db)

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
				updateRoles(client, allUsers[index], server)
				index++

				if (index === allUsers.length) {
					clearInterval(interval)
					server.members.cache.clear()
				}
			}, 1000)
		}

		// Monthly reset + 1 day
		if (new Date().getDate() === 2 && (new Date().getHours() === 0o1 || new Date().getHours() === 0o0) && new Date().getMinutes() === 0o0) {
			console.log(new Date().getDate(), 'Setting lottoSheet to Null')
			await db.collection.updateMany({ gSheet: { $exists: true } }, { $set: { lottoSheet: null } })
		}

		// Reset Info Count back to 0 to allow use of command
		await db.collection.find({}).toArray().then(r => {
			r = r.filter(doc => doc.resetInfoCount >= 0)
			for (const doc in r) {
				if (r[doc].resetInfoCount === 1 && r[doc].resetInfoTime < r[doc].resetInfoTime + 86400000) {
					return db.collection.updateOne({ serverName: r[doc].serverName }, {
						$set: {
							resetInfoCount: 0
						}
					})
				}
			}
		})
	})
}
