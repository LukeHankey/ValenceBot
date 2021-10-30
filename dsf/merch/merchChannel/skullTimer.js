import cron from 'node-cron'

const skullTimer = (message, updateDB, channels) => {
// Checking the DB and marking dead calls
	const timer = cron.schedule('* * * * *', async () => {
		const { merchChannel: { messages, channelID } } = await updateDB.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.messages': 1, 'merchChannel.channelID': 1 } })
		const merchChannelID = message.channel.guild.channels.cache.get(channelID)
		for await (const { messageID, content, time, userID, author } of messages) {
			try {
				// Removes bot messages
				if (userID === '668330399033851924' || content.includes('<@&670842187461820436>')) {
					await updateDB.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.messages': { messageID: messageID } } })
				}

				if (Date.now() - time > 600000) {
					const fetched = await message.channel.messages.fetch(messageID)
					fetched.react('☠️')
						.then(async () => {
							await updateDB.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.messages': { messageID: messageID } } })
							const getPerms = await merchChannelID.permissionOverwrites.cache.get(userID)
							if (getPerms) {
								const moreThanOnce = messages.filter(obj => {
									if (obj.userID === userID && obj.messageID !== messageID) return obj
								})
								if (moreThanOnce.length) return
								console.log(`Removing ${author} (${userID}) from channel overrides.`)
								return getPerms.delete()
							} else { }
						})
						.catch((e) => {
							channels.errors.send(e, module)
							return timer.stop()
						})
				}
			} catch (e) {
				if (e.code === 10008) {
					const errorMessageID = e.path.split('/')[4]
					return await updateDB.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.messages': { messageID: errorMessageID } } })
				} else { return channels.errors.send(e, module) }
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
				const message_id = getKeyByValue(counts, dupe)
				const entry = messages.find(id => id.messageID === message_id)
				updateDB.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.messages': { messageID: message_id } } })
				return updateDB.updateOne({ _id: message.channel.guild.id }, { $addToSet: { 'merchChannel.messages': entry } })
			} else {}
		})
	})
}

export default skullTimer
