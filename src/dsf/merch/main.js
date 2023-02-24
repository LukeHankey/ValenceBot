import timers from 'timers/promises'
import { MongoCollection } from '../../DataBase.js'
import { merchRegex, otherCalls } from './constants.js'
import { arrIncludesString, alreadyCalled } from './merchFunctions.js'
import { addMerchCount, skullTimer, removeReactPermissions, addOtherCount, tenMinutes } from '../index.js'
import { worldReaction } from './worlds.js'

const dsf = async (client, message, db) => {
	const channels = await db.channels
	const scouters = new MongoCollection('ScoutTracker')
	const {
		merchChannel: { channelID, otherChannelID, messages, otherMessages },
		disallowedWords
	} = await db.collection.findOne(
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
		await addMerchCount(client, message, db, scouters)
		if (
			merchRegex.test(message.content) &&
			arrIncludesString(disallowedWords, message.content) &&
			alreadyCalled(message, messages)
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
		await timers.setTimeout(tenMinutes)
		await skullTimer(message, db)
		await removeReactPermissions(message, messages)
	} else if (message.channel.id === otherChannelID) {
		await addOtherCount(client, message, db, scouters)
		if (
			!otherCalls.test(message.content) ||
			!arrIncludesString(disallowedWords, message.content) ||
			!alreadyCalled(message, otherMessages)
		) {
			return setTimeout(() => message.delete(), 200)
		} else {
			await worldReaction(message)
		}
		await timers.setTimeout(tenMinutes)
		await skullTimer(message, db, 'other')
	}
}

export default dsf
