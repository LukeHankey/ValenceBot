import { getWorldNumber } from './worlds.js'

const checkMemberRole = async (user, message) => {
	const mem = message.guild.members.cache.get(user) ?? (await message.guild.members.fetch(user))
	const allowedRoles = ['Scouter', 'Verified Scouter', 'Staff', 'Moderator (Bronze Star)', 'Administrator (Silver Star)']
	const collectionTotal = mem.roles.cache.filter((r) => allowedRoles.includes(r.name))
	if (collectionTotal.size) {
		return true
	} else {
		return false
	}
}

const messageInArray = (msg, array) => {
	return array.some((value) => msg.includes(value))
}
const worldAlreadyCalled = (message, messages) => {
	const worldNumber = getWorldNumber(message.content)

	const result = messages.filter((obj) => {
		const numFromDb = getWorldNumber(obj.content)
		if (numFromDb === worldNumber) {
			return obj
		}
		return null
	})

	// If already called, result.length > 0. Return false to delete the message.
	if (result.some((el) => el !== null)) {
		return true
	} else {
		return false
	}
}

export { checkMemberRole, messageInArray, worldAlreadyCalled }
