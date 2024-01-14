import { removeEvents } from '../../functions.js'

export default async (client, reaction, user) => {
	const db = client.database.settings
	const message = reaction.message
	const channels = await client.database.channels
	const { _id } = await db.findOne({ _id: message.guild.id }, { projection: { _id: 1 } })

	if (message.partial) await message.fetch().catch((err) => channels.errors.send(err))
	switch (message.guild.id) {
		case _id:
			// Valence
			if (_id === '472448603642920973' || _id === '668330890790699079') {
				if (user.bot) return
				const data = await db.findOne(
					{ _id: message.guild.id },
					{ projection: { events: 1, channels: 1, calendarID: 1 } }
				)

				if (message.channel.id === data.channels.events) {
					const messageMatch = data.events.filter((m) => m.messageID === message.id)

					if (!messageMatch.length) return
					if (reaction.emoji.name === '🛑') {
						if (user.id !== message.author.id) {
							return message.reactions.resolve('🛑').users.remove(user.id)
						}

						const [event] = data.events.filter((e) => e.messageID === message.id)

						await removeEvents(client, message, 'messageReactionAdd', data, event.eventTag)
					}
				}
			}
	}
}
