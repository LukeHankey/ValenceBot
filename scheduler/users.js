import fetch from 'node-fetch'
import { getDb } from '../mongodb.js'

const addActive = async () => {
	const db = await getDb()
	const usersColl = db.collection('Users')
	const users = await usersColl.find({}).toArray()
	let index = 0
	const interval = setInterval(async () => {
		try {
			const metricsProfile = await fetch(`https://apps.runescape.com/runemetrics/profile/profile?user=${users[index].clanMate}&activities=1`).then(response => response.json()).catch(err => console.error(`Unable to fetch RuneMetrics Profile for ${users[index].clanMate}.`, err))
			let lastActivityDate
			if (metricsProfile.error) {
				// console.log(users[index].clanMate, metricsProfile.error);
				await usersColl.updateOne({ clanMate: users[index].clanMate }, { $set: { profile: metricsProfile.error, gameActive: null } })
			} else {
				lastActivityDate = metricsProfile.activities.length ? metricsProfile.activities[0].date : 0
				lastActivityDate = Date.parse(lastActivityDate)

				if ((Date.now() - 2.628e+9) > lastActivityDate) {
					// console.log(`${users[index].clanMate} is not active`);
					await usersColl.updateOne({ clanMate: users[index].clanMate }, { $set: { gameActive: false } })
				} else {
					// console.log(`${users[index].clanMate} is active`);
					await usersColl.updateOne({ clanMate: users[index].clanMate }, { $set: { gameActive: true } })
				}
			}
			index++
		} catch (err) {
			console.error(err)
		}

		if (index === users.length) {
			clearInterval(interval)
		}
	}, 1000)
}

const clanCheck = async (users) => {
	const db = await getDb()
	const usersColl = db.collection('Users')
	try {
		let metricsProfile = await fetch(`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${users}%22%5D&callback=jQuery000000000000000_0000000000&_=0`).then(response => response.text())
		metricsProfile = JSON.parse(metricsProfile.slice(34, -4))

		if (metricsProfile.clan && metricsProfile.clan !== 'Valence') {
			console.log(metricsProfile.name, 'has left Valence for', metricsProfile.clan)
			await usersColl.deleteOne({ clanMate: metricsProfile.name }, { justOne: true })
			return false
		} else if (metricsProfile.clan && metricsProfile.clan === 'Valence') {
			console.log(metricsProfile.name, 'still in Valence')
			return true
		} else {
			console.log(metricsProfile.name, 'is not in any clan')
			await usersColl.deleteOne({ clanMate: metricsProfile.name }, { justOne: true })
			return false
		}
	} catch (err) {
		console.error(err)
	}
}

const nameChanges = async (missingNames) => {
	const db = await getDb()
	const usersColl = db.collection('Users')

	const nameChange = {
		change: []
	}

	for (const names of missingNames) {
		const potentialChangers = await usersColl.findOne({ clanMate: names })
		const potentialNewNames = await usersColl.find({ clanRank: potentialChangers.clanRank, kills: potentialChangers.kills, gameActive: 'undefined' }).toArray()
		let counter = 0
		const interval = setInterval(async () => {
			if (missingNames.length === counter) return clearInterval(interval)
			const check = await clanCheck(names)

			if (check) {
				const xpCheck = potentialNewNames.filter(user => {
					if (Number(user.totalXP) - 10000000 < Number(potentialChangers.totalXP) && Number(user.totalXP) + 10000000 > Number(potentialChangers.totalXP)) {
						return user
					} else return undefined
				})
				potentialChangers.potentialNewNames = xpCheck
				nameChange.change.push(potentialChangers)
			}
			counter++
		}, 1000)
	}

	if (nameChange.change.length) {
		return nameChange.change.forEach(async user => {
			console.log(`Updating ${user.clanMate} as they have potentially changed names`)
			return await usersColl.updateOne({ clanMate: user.clanMate }, { $set: { potentialNewNames: user.potentialNewNames } })
		})
	}
}

export {
	nameChanges,
	addActive
}
