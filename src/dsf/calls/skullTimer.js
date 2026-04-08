import timers from 'timers/promises'
import { logger } from '../../logging.js'
import { TEN_MINUTES, ALL_EVENTS_REGEX } from './constants.js'
import { nEmbed } from '../../functions.js'
import Color from '../../colors.js'

const eventTimes = {
	whirlpool: TEN_MINUTES / 2,
	sea_monster: TEN_MINUTES / 5,
	jellyfish: TEN_MINUTES / 5,
	whale: TEN_MINUTES / 5,
	treasure_turtle: TEN_MINUTES / 2,
	arkaneo: 39_000
}

export const skullTimer = async (client, message, channel = 'other') => {
	await timers.setTimeout(5000)
	let messageID = message.id
	const db = client.database.settings
	const channels = await client.database.channels

	try {
		await message.react('☠️')
	} catch (err) {
		if ([10008, 90001].includes(err.code)) {
			messageID = err?.url?.split('/')?.[8] ?? messageID
			const displayName = message.member?.displayName ?? message.author?.username ?? 'Unknown user'
			const avatarUrl = message.member?.displayAvatarURL?.() ?? message.author?.displayAvatarURL?.()

			const embed = nEmbed(
				err.rawError?.message ?? err.message,
				err.code === 90001
					? `${displayName} has blocked the bot. The bot is unable to react to their messages.`
					: `${displayName} message is no longer available to react to.`,
				Color.redDark,
				avatarUrl
			).addFields({
				name: 'Message:',
				value: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${messageID}`
			})

			// DSF Bot Logs
			const botLogsChannel = client.channels.cache.get('884076361940078682')
			if (botLogsChannel) {
				return await botLogsChannel.send({ embeds: [embed] })
			}
			logger.warn('DSF bot logs channel not found; unable to send skullTimer notification.')
			return
		}
		channels.errors.send(err)
	} finally {
		await db.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.otherMessages': { messageID } } })
	}
}

export const mistyEventTimer = (content) => {
	const timeSplit = /(?<time>\d{1,2}:\d{1,2})/
	const time = timeSplit.exec(content)?.groups.time

	// Get the type of event and corresponding event duration
	const callMatch = ALL_EVENTS_REGEX.exec(content)?.groups
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

export const startupRemoveReactionPermissions = async (client, db) => {
	const {
		merchChannel: { otherMessages, otherChannelID }
	} = await db.findOne({ _id: '420803245758480405' }, { projection: { merchChannel: { otherMessages: 1, otherChannelID: 1 } } })

	const channelObj = client.channels.cache.get(otherChannelID)

	for (const messageObj of otherMessages) {
		const unwrappedMessageObj = (({ messageID, userID, time, author }) => ({ messageID, userID, time, author }))(messageObj)
		try {
			const message = await channelObj.messages.fetch(unwrappedMessageObj.messageID)
			const timePassed = Date.now() - unwrappedMessageObj.time
			if (timePassed < TEN_MINUTES) {
				await timers.setTimeout(TEN_MINUTES - (Date.now() - unwrappedMessageObj.time))
			}
			await skullTimer(client, message, 'other')
		} catch (err) {
			console.log(err)
			await db.updateOne(
				{ _id: '420803245758480405' },
				{
					$pull: {
						'merchChannel.otherMessages': { messageID: unwrappedMessageObj.messageID }
					}
				}
			)
		}
	}
}
