import { ScouterCheck } from '../../classes.js'
import { Util, Formatters } from 'discord.js'
const scout = new ScouterCheck('Scouter')
const vScout = new ScouterCheck('Verified Scouter')

const classVars = async (name, serverName, database, client, scouters) => {
	name._client = client
	name._guildName = serverName
	// eslint-disable-next-line array-callback-return
	name._db = await database.map(doc => {
		if (doc.serverName === name._guildName) return doc
	}).filter(x => x)[0]
	name._scouters = scouters
}

const addedRoles = async (name, db) => {
	const members = await name.checkRolesAdded()
	members.map(async x => {
		const role = await name.role
		await db.collection.updateOne({ userID: x.id }, {
			$addToSet: {
				assigned: role.id
			}
		})
	})
}
const removedRoles = async (name, db) => {
	const checkRoles = await name.checkRolesRemoved()
	checkRoles.map(async x => {
		const role = await name.role
		await db.collection.updateOne({ userID: x.id }, {
			$pull: {
				assigned: role.id
			}
		})
	})
}

const removeInactives = async (name, db, scouters) => {
	const inactives = await name.removeInactive()
	const channels = await db.channels
	const removed = []
	const allItems = []
	const sixMonths = 1.577e+10
	inactives.map(async doc => {
		if (doc.active === 0 && (Date.now() - doc.lastTimestamp) > sixMonths) {
			removed.push(doc.author)
			allItems.push(`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count}).`)
			await scouters.collection.remove(
				{ userID: doc.userID }
			)
		} else {
			if (!doc.active) return
			allItems.push(`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count}). User has been marked as inactive.`)
			await scouters.collection.updateOne(
				{ userID: doc.userID },
				{ $set: { active: 0 } }
			)
		}
	})
	if (allItems.length) {
		const split = Util.splitMessage(`${allItems.join('\n')}`)
		return split.forEach(async content => channels.logs.send(`${removed.length} profiles removed.\n${Formatters.codeBlock(content)}`))
	}
}

export {
	scout,
	vScout,
	classVars,
	addedRoles,
	removedRoles,
	removeInactives
}
