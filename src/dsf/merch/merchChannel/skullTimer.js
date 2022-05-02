import cron from 'node-cron'

export const skullTimer = (message, db) => {
// Checking the DB and marking dead calls
	const timer = cron.schedule('* * * * *', async () => {
		const channels = await db.channels
		const { merchChannel: { messages, channelID } } = await db.collection.findOne({ _id: message.guild.id }, { projection: { 'merchChannel.messages': 1, 'merchChannel.channelID': 1 } })
		const merchChannelID = message.guild.channels.cache.get(channelID)
		for (const { messageID, content, time, userID, author } of messages) {
			try {
				// Removes bot messages
				if (userID === '668330399033851924' || content.includes('<@&670842187461820436>')) {
					await db.collection.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID } } })
				}

				if (Date.now() - time > 600_000) {
					const fetched = await message.channel.messages.fetch(messageID)
					try {
						await fetched.react('☠️')
						await db.collection.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID } } })
						const getPerms = merchChannelID.permissionOverwrites.cache.get(userID)
						if (getPerms) {
							const moreThanOnce = messages.filter(obj => (obj.userID === userID) && (obj.messageID !== messageID))
							if (moreThanOnce.length) return
							console.log(`Removing ${author} (${userID}) from channel overrides.`)
							getPerms.delete()

							const overridesCheck = merchChannelID.permissionOverwrites.cache.filter(p => p.type === 'member' && p.id !== userID)
							if (overridesCheck.size) {
								const overrides = [...overridesCheck.values()]
								for (const rem of overrides) {
									const moreThanOnce = messages.filter(obj => (obj.userID === rem.id) && (obj.messageID !== messageID)).map(m => m.userID)
									if (moreThanOnce.includes(rem.id)) continue
									const leftOverMember = await message.guild.members.fetch(rem.id)
									console.log(leftOverMember.id, leftOverMember.displayName)
									console.log(`Removing remenant member: ${leftOverMember?.displayName} from channel overrides.`)
									const userToRemove = merchChannelID.permissionOverwrites.cache.get(rem.id)
									userToRemove.delete()
								}
							}
						}
					} catch (err) {
						channels.errors.send(err)
						return timer.stop()
					}
				}
			} catch (e) {
				if (e.code === 10008) {
					const errorMessageID = e.url.split('/')[8]
					return await db.collection.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: errorMessageID } } })
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
				db.collection.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: messageId } } })
				return db.collection.updateOne({ _id: message.guild.id }, { $addToSet: { 'merchChannel.messages': entry } })
			}
		})
	})
}
