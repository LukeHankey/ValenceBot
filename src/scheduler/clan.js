import fetch from 'node-fetch'
import { csvJSON, renameKeys } from '../functions.js'
import { nameChanges } from './users.js'
import dotenv from 'dotenv'
dotenv.config()

export * from './users.js'
export const getData = async (db) => {
	const clanData = await fetch(
		'http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Valence'
	)
	const text = clanData.text()
	const json = text.then((body) => csvJSON(body))

	json.then(async (res) => {
		const newData = []

		for (const info of res) {
			const regex = /�/g
			if (info.Clanmate.includes('�')) {
				info.Clanmate = info.Clanmate.replace(regex, ' ') || info.Clanmate
			}
			newData.push(info)
		}

		newData.forEach(async (clanUser) => {
			clanUser = renameKeys(
				{ Clanmate: 'clanMate', ' Clan Rank': 'clanRank', ' Total XP': 'totalXP', ' Kills': 'kills' },
				clanUser
			)
			clanUser.discord = ''
			clanUser.discActive = false
			clanUser.alt = false
			clanUser.gameActive = false
			const dbCheck = await db.collection.findOne({ clanMate: clanUser.clanMate })
			if (!dbCheck) {
				if (clanUser.clanMate === '') return
				clanUser.gameActive = 'undefined'
				await db.collection.insertOne(clanUser)
				console.log(`New to the clan: ${clanUser.clanMate}`)
			} else {
				// Updates total XP
				await db.collection.updateOne(
					{ clanMate: clanUser.clanMate },
					{
						$set: {
							clanRank: clanUser.clanRank,
							totalXP: clanUser.totalXP,
							kills: clanUser.kills
						}
					}
				)
			}
		})

		let allUsers = await db.collection.find({}).project({ clanMate: 1, _id: 0 }).toArray()
		allUsers = allUsers.map((user) => user.clanMate)
		const newDataNames = newData.map((user) => user.Clanmate)
		const missingNames = allUsers.filter((name) => !newDataNames.includes(name))
		console.log('Missing names: ', missingNames)
		await nameChanges(missingNames, db)
	}).catch((error) => console.error(error))
}
