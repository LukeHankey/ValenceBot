import fetch from 'node-fetch'
import { promisify } from 'util'

const wait = promisify(setTimeout)

export const addActive = async (db) => {
	const users = await db.collection.find({}).toArray()
	let index = 0
	const interval = setInterval(async () => {
		try {
			const metricsProfile = await fetch(`https://apps.runescape.com/runemetrics/profile/profile?user=${users[index].clanMate}&activities=1`)
				.then(response => response.json())
				.catch(err => console.error(`Unable to fetch RuneMetrics Profile for ${users[index].clanMate}.`, err))

			let lastActivityDate
			if ('error' in metricsProfile) {
				// console.log(users[index].clanMate, metricsProfile.error);
				await db.collection.updateOne({ clanMate: users[index].clanMate }, { $set: { profile: metricsProfile.error, gameActive: null } })
			} else {
				lastActivityDate = metricsProfile.activities.length ? metricsProfile.activities[0].date : 0
				lastActivityDate = Date.parse(lastActivityDate)

				if ((Date.now() - 2.628e+9) > lastActivityDate) {
					// console.log(`${users[index].clanMate} is not active`);
					await db.collection.updateOne({ clanMate: users[index].clanMate }, { $set: { gameActive: false } })
				} else {
					// console.log(`${users[index].clanMate} is active`);
					await db.collection.updateOne({ clanMate: users[index].clanMate }, { $set: { gameActive: true } })
				}
			}
			index++
		} catch (err) {
			console.error(err)
		}

		if (index === users.length) {
			clearInterval(interval)
		}
	}, 3000)
}

const clanCheck = async (users, db) => {
	try {
		let metricsProfile = await fetch(`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${users}%22%5D&callback=jQuery000000000000000_0000000000&_=0`).then(response => response.text())
		metricsProfile = JSON.parse(metricsProfile.slice(34, -4))

		if (metricsProfile.clan && metricsProfile.clan !== 'Valence') {
			console.log(metricsProfile.name, 'has left Valence for', metricsProfile.clan)
			await db.collection.deleteOne({ clanMate: metricsProfile.name }, { justOne: true })
			return false
		} else if (metricsProfile.clan && metricsProfile.clan === 'Valence') {
			console.log(metricsProfile.name, 'still in Valence')
			return true
		} else {
			console.log(metricsProfile.name, 'is not in any clan')
			return true
		}
	} catch (err) {
		console.error(err)
	}
}

export const nameChanges = async (missingNames, db) => {
	const nameChange = []

	for (const names of missingNames) {
		const potentialChangers = await db.collection.findOne({ clanMate: names })
		/**
		 * Find any clan member who has the same rank, kills and has gameActive as undefined.
		 * gameActive: undefined since these will be the members who are "new to the clan"
		 */
		const potentialNewNames = await db.collection.find({ clanRank: potentialChangers.clanRank, kills: potentialChangers.kills, gameActive: 'undefined' }).toArray()
		const check = await clanCheck(names, db)
		await wait(1000)

		if (check) {
			// eslint-disable-next-line array-callback-return
			const xpCheck = potentialNewNames.filter(user => {
				if (Number(user.totalXP) - 10_000_000 < Number(potentialChangers.totalXP) && Number(user.totalXP) + 10_000_000 > Number(potentialChangers.totalXP)) {
					return user
				}
			})
			potentialChangers.potentialNewNames = xpCheck
			nameChange.push(potentialChangers)
		}
	}

	if (nameChange.length) {
		return nameChange.forEach(async user => {
			console.log(`Updating ${user.clanMate} as they have potentially changed names`)
			await db.collection.updateOne({ clanMate: user.clanMate }, { $set: { potentialNewNames: user.potentialNewNames } })
		})
	}
}
