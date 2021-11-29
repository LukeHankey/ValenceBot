import cron from 'node-cron'

export const skullTimer = (message, db) => {
// Checking the DB and marking dead calls
	const timer = cron.schedule('* * * * *', async () => {
		const channels = await db.channels
		const { merchChannel: { messages, channelID } } = await db.collection.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.messages': 1, 'merchChannel.channelID': 1 } })
		const merchChannelID = message.channel.guild.channels.cache.get(channelID)
		for await (const { messageID, content, time, userID, author } of messages) {
			try {
				// Removes bot messages
				if (userID === '668330399033851924' || content.includes('<@&670842187461820436>')) {
					await db.collection.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.messages': { messageID: messageID } } })
				}

				if (Date.now() - time > 600000) {
					const fetched = await message.channel.messages.fetch(messageID)
					fetched.react('☠️')
						.then(async () => {
							await db.collection.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.messages': { messageID: messageID } } })
							const getPerms = await merchChannelID.permissionOverwrites.cache.get(userID)
							if (getPerms) {
								const moreThanOnce = messages.filter(obj => {
									if (obj.userID === userID && obj.messageID !== messageID) return obj
									else return undefined
								})
								if (moreThanOnce.length) return
								console.log(`Removing ${author} (${userID}) from channel overrides.`)
								return getPerms.delete()
							}
						})
						.catch(async (e) => {
							channels.errors.send(e)
							return timer.stop()
						})
				}
			} catch (e) {
				if (e.code === 10008) {
					const errorMessageID = e.path.split('/')[4]
					return await db.collection.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.messages': { messageID: errorMessageID } } })
				} else { return channels.errors.send(e) }
			}
		}

		// Removing duplicates
		const counts = {}
		messages.forEach(function (x) { counts[x.messageID] = (counts[x.messageID] || 0) + 1 })
		function getKeyByValue (object, value) {
			return Object.keys(object).find(key => object[key] === value)
		}
		Object.values(counts).forEach(dupe => {
			if (dupe > 1) {
				const messageId = getKeyByValue(counts, dupe)
				const entry = messages.find(id => id.messageID === messageId)
				db.collection.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.messages': { messageID: messageId } } })
				return db.collection.updateOne({ _id: message.channel.guild.id }, { $addToSet: { 'merchChannel.messages': entry } })
			}
		})
	})
}
