import timers from 'timers/promises'
import { merchRegex, otherCallsRegex, worldFullMessage } from './constants.js'
import { messageInArray, worldAlreadyCalled } from './merchFunctions.js'
import { addMerchCount, skullTimer, removeReactPermissions, addOtherCount, mistyEventTimer } from '../index.js'
import { worldReaction, getWorldNumber } from './worlds.js'

const dsf = async (client, message) => {
	const db = client.database.settings
	const channels = await client.database.channels
	const scouters = client.database.scoutTracker
	const {
		merchChannel: { channelID, otherChannelID, messages, otherMessages },
		disallowedWords
	} = await db.findOne(
		{ _id: message.guild.id, merchChannel: { $exists: true } },
		{
			projection: {
				'merchChannel.channelID': 1,
				'merchChannel.otherChannelID': 1,
				'merchChannel.messages': 1,
				disallowedWords: 1,
				'merchChannel.otherMessages': 1
			}
		}
	)

	if (message.author.bot) return
	if (message.channel.id === channelID) {
		await addMerchCount(client, message, scouters)
		if (
			merchRegex.test(message.content) &&
			!messageInArray(message.content, disallowedWords) &&
			!worldAlreadyCalled(message, messages)
		) {
			const rolePing = '<@&670842187461820436>'
			const sentMessage = await message.channel.send(`${rolePing} - ${message.content}`)

			try {
				setTimeout(() => sentMessage.delete(), 200)
			} catch (err) {
				const messageID = err.url.split('/')
				return await message.channel.messages
					.fetch(messageID[8])
					.then((x) => x.delete())
					.catch((err) => channels.errors.send(err))
			}
			await worldReaction(message)
		} else {
			return setTimeout(() => message.delete(), 200)
		}

		if (getWorldNumber(message) === 84) {
			await message.channel.send({ content: worldFullMessage })
		}

		await timers.setTimeout(mistyEventTimer(message.content))
		await skullTimer(client, message)
		await removeReactPermissions(message, messages)
	} else if (message.channel.id === otherChannelID) {
		await addOtherCount(client, message, scouters)
		if (
			!otherCallsRegex.test(message.content) ||
			messageInArray(message.content, disallowedWords) ||
			worldAlreadyCalled(message, otherMessages)
		) {
			return setTimeout(() => message.delete(), 200)
		} else {
			await worldReaction(message)
		}

		if (getWorldNumber(message) === 84) {
			await message.channel.send({ content: worldFullMessage })
		}

		await timers.setTimeout(mistyEventTimer(message.content))
		await skullTimer(client, message, 'other')
	}
}

export default dsf
