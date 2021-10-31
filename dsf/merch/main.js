import { getDb } from '../../mongodb.js'
import { merchRegex, otherCalls } from './constants.js'
import addMerchCount from './merchChannel/merchCount.js'
import skullTimer from './merchChannel/skullTimer.js'
import addOtherCount from './otherCalls/otherCount.js'
import otherTimer from './otherCalls/otherTimer.js'
import { arrIncludesString, alreadyCalled } from './merchFunctions.js'

const dsf = async (client, message, channels) => {
	const db = getDb()
	const settingsColl = db.collection('Settings')
	const { merchChannel: { channelID, otherChannelID, messages, otherMessages }, disallowedWords } = await settingsColl.findOne({ _id: message.guild.id, merchChannel: { $exists: true } }, { projection: { 'merchChannel.channelID': 1, 'merchChannel.otherChannelID': 1, 'merchChannel.messages': 1, disallowedWords: 1, 'merchChannel.otherMessages': 1 } })

	if (message.author.bot) return
	if (message.channel.id === channelID) {
		merchRegex.test(message.content) && arrIncludesString(disallowedWords, message.content) && alreadyCalled(message, messages)
			?			message.channel.send(`<@&670842187461820436> - ${message.content}`)
				.then(async mes => {
					return setTimeout(() => mes.delete(), 200)
				})
				.catch(async err => {
					const messageID = err.path.split('/')
					return await message.channel.messages.fetch(messageID[4]).then(x => x.delete()).catch((err) => channels.errors.send(err))
				})
			:	setTimeout(() => message.delete(), 200)
		await addMerchCount(client, message, settingsColl, channels)
		skullTimer(message, settingsColl, channels)
	} else if (message.channel.id === otherChannelID) {
		console.log(!otherCalls.test(message.content), !arrIncludesString(disallowedWords, message.content), !alreadyCalled(message, otherMessages))
		if (!otherCalls.test(message.content) || !arrIncludesString(disallowedWords, message.content) || !alreadyCalled(message, otherMessages)) {
			return message.delete()
		}
		await addOtherCount(message, settingsColl, channels)
		otherTimer(message, settingsColl, channels)
	}
}

export default dsf
