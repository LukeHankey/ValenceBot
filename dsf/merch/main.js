import { merchRegex, otherCalls } from './constants.js'
import { arrIncludesString, alreadyCalled } from './merchFunctions.js'
import { addMerchCount, skullTimer, addOtherCount, otherTimer } from '../index.js'

const dsf = async (client, message, db) => {
	const channels = await db.channels
	const { merchChannel: { channelID, otherChannelID, messages, otherMessages }, disallowedWords } = await db.collection.findOne({ _id: message.guild.id, merchChannel: { $exists: true } }, { projection: { 'merchChannel.channelID': 1, 'merchChannel.otherChannelID': 1, 'merchChannel.messages': 1, disallowedWords: 1, 'merchChannel.otherMessages': 1 } })

	if (message.author.bot) return
	if (message.channel.id === channelID) {
		merchRegex.test(message.content) && arrIncludesString(disallowedWords, message.content) && alreadyCalled(message, messages)
			?			message.channel.send(`<@&670842187461820436> - ${message.content}`)
				.then(async mes => {
					return setTimeout(() => mes.delete(), 200)
				})
				.catch(async err => {
					const messageID = err.path.split('/')
					return await message.channel.messages.fetch(messageID[4]).then(x => x.delete()).catch(async (err) => channels.errors.send(err))
				})
			:	setTimeout(() => message.delete(), 200)
		await addMerchCount(client, message, db)
		skullTimer(message, db)
	} else if (message.channel.id === otherChannelID) {
		if (!otherCalls.test(message.content) || !arrIncludesString(disallowedWords, message.content) || !alreadyCalled(message, otherMessages)) {
			return message.delete()
		}
		await addOtherCount(message, db)
		otherTimer(message, db)
	}
}

export default dsf
