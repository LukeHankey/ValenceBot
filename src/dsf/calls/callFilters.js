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

/**
 * Whether the message contains any of the guild's disallowed words.
 *
 * `disallowedWords` is optional in the settings document, so a guild that has
 * never set one projects as undefined. That threw on every call message.
 */
const messageInArray = (msg, array) => {
	return (array ?? []).some((value) => msg.includes(value))
}

/**
 * Whether this world has already been called in the messages on record.
 *
 * getWorldNumber returns null for content with no world in it rather than
 * throwing, so a message with no world used to match every stored message that
 * also had none — null === null — and the call was reported as a duplicate.
 * No world means nothing to compare, so nothing matches.
 */
const worldAlreadyCalled = (message, messages) => {
	const worldNumber = getWorldNumber(message.content)
	if (worldNumber === null) return false

	return (messages ?? []).some((obj) => getWorldNumber(obj.content) === worldNumber)
}

export { checkMemberRole, messageInArray, worldAlreadyCalled }
