import { mistyEventTimer, addCount, addMessageToDB, getWorldNumber, worldReaction, WORLD_FULL_MESSAGE } from '../index.js'
import { startEventTimer } from './eventTimers.js'
import { v4 as uuid } from 'uuid'
import axios from 'axios'

const dsf = async (client, message) => {
	const db = client.database.settings
	const channels = await client.database.channels
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

	const comeViaWebhook = message.author.username === 'Alt1 Tracker'
	if (message.author.bot && !comeViaWebhook) return

	let channelName, callDataBaseMessages
	if (message.channel.id === channelID) {
		channelName = 'merch'
		callDataBaseMessages = messages
	} else {
		channelName = 'other'
		callDataBaseMessages = otherMessages
	}

	const API_URL = process.env.NODE_ENV === 'DEV' ? 'http:localhost:8000' : 'https://api.dsfeventtracker.com'
	const worldNumber = getWorldNumber(message.content)
	if (!worldNumber) return setTimeout(() => message.delete(), 200)
	let alt1Count = false
	let eventData = null
	let eventID = uuid()
	try {
		const event = await axios.get(`${API_URL}/worlds/${worldNumber}/event`)
		if (event.data && event.data.message[0]?.status === 'Active') {
			alt1Count = true
			eventData = JSON.parse(event.data.message[0].event_record)
			eventID = eventData.id
		}
	} catch (err) {
		if (err.response.data.detail !== 'No active event found for this world') {
			console.log(worldNumber, err.response?.data?.detail)
			channels.errors.send(err)
		}
	}

	const success = !comeViaWebhook ? await addCount(client, message, channelName, alt1Count) : true
	eventID = eventData ? eventData.id : eventID

	if (success) {
		await addMessageToDB(message, db, eventID, channelName)
		client.logger.info(`Message from ${message.author.username} has been added to the database - ${message.content}`)
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

		if (worldNumber === 84) {
			await message.channel.send({ content: WORLD_FULL_MESSAGE })
		}

		const durationMs = eventData
			? eventData.duration * 1000 - (Date.now() - eventData.timestamp)
			: mistyEventTimer(message.content)

		startEventTimer({
			client,
			message,
			eventId: eventID,
			channelName,
			durationMs,
			database: callDataBaseMessages
		})
	} else {
		return setTimeout(() => message.delete(), 200)
	}
}

export default dsf
