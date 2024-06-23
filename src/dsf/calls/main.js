import timers from 'timers/promises'
import {
	skullTimer,
	removeReactPermissions,
	mistyEventTimer,
	addCount,
	getWorldNumber,
	worldReaction,
	WORLD_FULL_MESSAGE
} from '../index.js'

const dsf = async (client, message) => {
	const db = client.database.settings
	const channels = await client.database.channels
	const scouters = client.database.scoutTracker
	const {
		merchChannel: { channelID, messages, otherMessages }
	} = await db.findOne(
		{ _id: message.guild.id, merchChannel: { $exists: true } },
		{
			projection: {
				'merchChannel.channelID': 1,
				'merchChannel.messages': 1,
				'merchChannel.otherMessages': 1
			}
		}
	)

	if (message.author.bot) return

	let channelName, callDataBaseMessages
	if (message.channel.id === channelID) {
		channelName = 'merch'
		callDataBaseMessages = messages
	} else {
		channelName = 'other'
		callDataBaseMessages = otherMessages
	}

	const success = await addCount(client, message, scouters, channelName)

	if (success) {
		if (channelName === 'merch') {
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
		}

		await worldReaction(message)

		if (getWorldNumber(message.content) === 84) {
			await message.channel.send({ content: WORLD_FULL_MESSAGE })
		}

		await timers.setTimeout(mistyEventTimer(message.content))
		await skullTimer(client, message, channelName)
		await removeReactPermissions(message, callDataBaseMessages)
	} else {
		return setTimeout(() => message.delete(), 200)
	}
}

export default dsf
