import timers from 'timers/promises'
import { logger } from '../../logging.js'
import { tenMinutes, allEvents } from './constants.js'

const eventTimes = {
	merchant: tenMinutes,
	whirlpool: tenMinutes / 2,
	sea_monster: tenMinutes / 5,
	jellyfish: tenMinutes / 5,
	whale: tenMinutes / 5,
	treasure_turtle: tenMinutes / 2,
	arkaneo: 39_000
}

export const skullTimer = async (client, message, channel = 'merch') => {
	const messageID = message.id
	const db = client.database.settings
	const channels = await client.database.channels
	try {
		await message.react('☠️')
		if (channel === 'merch') {
			await db.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID } } })
		} else {
			await db.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.otherMessages': { messageID } } })
		}
	} catch (err) {
		if (err.code === 10008) {
			const errorMessageID = err.url.split('/')[8]
			if (channel === 'merch') {
				return await db.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { errorMessageID } } })
			} else {
				return await db.updateOne(
					{ _id: message.guild.id },
					{ $pull: { 'merchChannel.otherMessages': { errorMessageID } } }
				)
			}
		} else {
			return channels.errors.send(err)
		}
	}
}

export const mistyEventTimer = (content) => {
	const timeSplit = /(?<time>\d{1,2}:\d{1,2})/
	const time = timeSplit.exec(content)?.groups.time

	// Get the type of event and corresponding event duration
	const callMatch = allEvents.exec(content)?.groups
	const maxEventTime = eventTimes[Object.entries(callMatch).find(([key, val]) => val !== undefined)?.[0]]

	// All time values are less than 10 minutes so the format will always be X:XX
	if (time === undefined || time.length > 4) {
		return maxEventTime
	} else {
		const [minute, seconds] = time.split(':')
		const totalMilliseconds = (Number(minute) * 60 + Number(seconds)) * 1_000

		return maxEventTime - totalMilliseconds
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
	} = await db.findOne(
		{ _id: '420803245758480405' },
		{ projection: { merchChannel: { channelID: 1, messages: 1, otherMessages: 1, otherChannelID: 1 } } }
	)

	const channelObj = client.channels.cache.get(channel === 'merch' ? channelID : otherChannelID)
	const messageCollection = channel === 'merch' ? messages : otherMessages

	for (const messageObj of messageCollection) {
		const unwrappedMessageObj = (({ messageID, userID, time, author }) => ({ messageID, userID, time, author }))(messageObj)
		try {
			const message = await channelObj.messages.fetch(unwrappedMessageObj.messageID)
			const timePassed = Date.now() - unwrappedMessageObj.time
			if (timePassed < tenMinutes) {
				await timers.setTimeout(tenMinutes - (Date.now() - unwrappedMessageObj.time))
			}
			await skullTimer(message, db, channel)
			if (channel !== 'merch') continue
			await removeReactPermissions(message, messages)
		} catch (err) {
			console.log(err)
			await db.updateOne(
				{ _id: '420803245758480405' },
				{
					$pull: {
						'merchChannel.otherMessages': { messageID: unwrappedMessageObj.messageID },
						'merchChannel.messages': { messageID: unwrappedMessageObj.messageID }
					}
				}
			)
		}
	}
}
