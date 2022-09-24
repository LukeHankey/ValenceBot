import { MongoCollection } from '../../DataBase.js'
import { merchRegex, otherCalls } from './constants.js'
import { arrIncludesString, alreadyCalled } from './merchFunctions.js'
import { addMerchCount, skullTimer, addOtherCount, otherTimer } from '../index.js'
import { worldReaction } from './worlds.js'
// import { worldReaction, worlds } from './worlds.js'

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
			const worldNumber = parseInt(/\w(\d{1,3})/.exec(message.content)[1])
			// const freshStartWorlds = worlds.map((item) => (item.reason === 'fsw' ? item.world : null)).filter(Boolean)
			const rolePing = '<@&670842187461820436>'
			// if (freshStartWorlds.includes(worldNumber)) {
			// 	rolePing = '<@&1022966016604651611>'
			// }

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
			await worldReaction(worldNumber, message)
		} else {
			setTimeout(() => message.delete(), 200)
		}
		skullTimer(message, db)
	} else if (message.channel.id === otherChannelID) {
		await addOtherCount(client, message, db, scouters)
		if (
			!otherCalls.test(message.content) ||
			!arrIncludesString(disallowedWords, message.content) ||
			!alreadyCalled(message, otherMessages)
		) {
			return setTimeout(() => message.delete(), 200)
		} else {
			const worldNumber = parseInt(/\w(\d{1,3})/.exec(message.content)[1])
			await worldReaction(worldNumber, message)
		}
		otherTimer(message, db)
	}
}

export default dsf
