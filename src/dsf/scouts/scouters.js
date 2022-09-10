import { ScouterCheck } from '../../classes.js'
import { codeBlock } from 'discord.js'
import { splitMessage } from '../../functions.js'
const scout = new ScouterCheck('Scouter')
const vScout = new ScouterCheck('Verified Scouter')

const classVars = async (name, serverName, database, client, scouters) => {
	name._client = client
	name._guildName = serverName
	name._db = await database
		// eslint-disable-next-line array-callback-return
		.map((doc) => {
			if (doc.serverName === name._guildName) return doc
		})
		.filter((x) => x)[0]
	name._scouters = scouters
}

const addedRoles = async (name, scoutTracker) => {
	const members = await name.checkRolesAdded()
	members.map(async (x) => {
		const role = await name.role
		await scoutTracker.collection.updateOne(
			{ userID: x.id },
			{
				$addToSet: {
					assigned: role.id
				}
			}
		)
	})
}
const removedRoles = async (name, scoutTracker) => {
	const checkRoles = await name.checkRolesRemoved()
	checkRoles.map(async (x) => {
		const role = await name.role
		await scoutTracker.collection.updateOne(
			{ userID: x.id },
			{
				$pull: {
					assigned: role.id
				}
			}
		)
	})
}

const removeInactives = async (name, db, scoutTracker) => {
	const inactives = await name.removeInactive(scoutTracker)
	const channels = await db.channels
	const removed = []
	const allItems = []
	const sixMonths = 1.577e10
	inactives.map(async (doc) => {
		if (doc.active === 0 && Date.now() - doc.lastTimestamp > sixMonths) {
			removed.push(doc.author)
			allItems.push(`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count}).`)
			await scoutTracker.collection.deleteOne({ userID: doc.userID })
		} else {
			if (!doc.active) return
			allItems.push(
				`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count}). User has been marked as inactive.`
			)
			await scoutTracker.collection.updateOne({ userID: doc.userID }, { $set: { active: 0 } })
		}
	})
	if (allItems.length) {
		const split = splitMessage(`${allItems.join('\n')}`)
		return split.forEach(async (content) => channels.logs.send(`${removed.length} profiles removed.\n${codeBlock(content)}`))
	}
}

const removeScouters = async (options) => {
	const THREE_MONTHS = 7.884e9
	const { scoutProfiles, database, tracker } = options
	const channels = await database.channels
	const scouter = scoutProfiles[0]

	// Includes both scouters and verified
	const scoutersAtRisk = scouter._scouters.filter((sc) => {
		const lastThreeMonths = Date.now() - sc.lastTimestamp >= THREE_MONTHS
		return lastThreeMonths && !sc.oldScout
	})
	const dsfServer = await scouter.guild
	for (const profile of scoutersAtRisk) {
		console.log(profile)
		for (const scout of scoutProfiles) {
			try {
				// Remove both roles, if they have both
				await dsfServer.members.removeRole({
					user: profile.userID,
					role: await scout.role
				})
			} catch (err) {
				channels.errors.send(err)
			}
		}
		// Update DB
		await tracker.collection.updateOne(
			{ userID: profile.userID },
			{
				$set: {
					oldScout: {
						count: profile.count,
						otherCount: profile.otherCount,
						firstTimestamp: profile.firstTimestamp,
						lastTimestamp: profile.lastTimestamp,
						firstPost: true
					},
					count: 0,
					otherCount: 0,
					assigned: [],
					active: 0,
					lastTimestamp: Date.now() // Give them 6 months before being cleared from DB
				}
			}
		)
	}
}

export { scout, vScout, classVars, addedRoles, removedRoles, removeInactives, removeScouters }
