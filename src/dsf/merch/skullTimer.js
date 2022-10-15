import timers from 'timers/promises'
import { logger } from '../../logging.js'
import { tenMinutes } from './constants.js'

export const skullTimer = async (message, db, channel = 'merch') => {
	const messageID = message.id
	const channels = await db.channels
	try {
		await message.react('☠️')
		if (channel === 'merch') {
			await db.collection.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID } } })
		} else {
			await db.collection.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.otherMessages': { messageID } } })
		}
	} catch (err) {
		if (err.code === 10008) {
			const errorMessageID = err.url.split('/')[8]
			if (channel === 'merch') {
				return await db.collection.updateOne(
					{ _id: message.guild.id },
					{ $pull: { 'merchChannel.messages': { errorMessageID } } }
				)
			} else {
				return await db.collection.updateOne(
					{ _id: message.guild.id },
					{ $pull: { 'merchChannel.otherMessages': { errorMessageID } } }
				)
			}
		} else {
			return channels.errors.send(err)
		}
	}
}

export const removeReactPermissions = async (message, allMessages) => {
	const merchChannel = message.channel
	const channelPermissions = merchChannel.permissionOverwrites.cache.get(message.author.id)

	if (channelPermissions) {
		const moreThanOnce = allMessages.filter((obj) => obj.userID === message.author.id && obj.messageID !== message.id)
		if (moreThanOnce.length) return
		logger.info(`Removing ${message.author.username} (${message.author.id}) from channel overrides.`)
		channelPermissions.delete()
	}
}

export const startupRemoveReactionPermissions = async (client, db, channel = 'merch') => {
	const {
		merchChannel: { channelID, messages, otherMessages, otherChannelID }
	} = await db.collection.findOne(
		{ _id: '420803245758480405' },
		{ projection: { merchChannel: { channelID: 1, messages: 1, otherMessages: 1, otherChannelID: 1 } } }
	)

	const channelObj = client.channels.cache.get(channel === 'merch' ? channelID : otherChannelID)
	const messageCollection = channel === 'merch' ? messages : otherMessages

	for (const messageObj of messageCollection) {
		const unwrappedMessageObj = (({ messageID, userID, time, author }) => ({ messageID, userID, time, author }))(messageObj)
		const message = await channelObj.messages.fetch(unwrappedMessageObj.messageID)
		const timePassed = Date.now() - unwrappedMessageObj.time
		if (timePassed < tenMinutes) {
			await timers.setTimeout(tenMinutes - (Date.now() - unwrappedMessageObj.time))
		}
		await skullTimer(message, db, channel)
		if (channel !== 'merch') continue
		await removeReactPermissions(message, messages)
	}
}
