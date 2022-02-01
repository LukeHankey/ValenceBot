export const addOtherCount = async (message, db, scouters) => {
	// Adds count for other events channel
	const channels = await db.channels
	try {
		const mesOne = await message.channel.messages.fetch({ limit: 1 })
		const logOne = [...mesOne.values()]
		const msg = logOne.map(val => val)

		const findMessage = await scouters.collection.findOne({ userID: msg[0].author.id })
		if (!findMessage) {
			console.log(`New other: ${msg[0].author.username} (${message.content})`, msg[0].author.id)
			await scouters.collection.insert({
				userID: msg[0].author.id,
				author: msg[0].member.nickname ?? msg[0].author.username,
				firstTimestamp: msg[0].createdTimestamp,
				firstTimestampReadable: new Date(msg[0].createdTimestamp),
				lastTimestamp: msg[0].createdTimestamp,
				lastTimestampReadable: new Date(msg[0].createdTimestamp),
				count: 0,
				game: 0,
				otherCount: 1,
				active: 1,
				assigned: []
			})
		} else {
			console.log(`Old other: ${msg[0].author.username} (${message.content})`, msg[0].author.id)
			await scouters.collection.updateOne({ userID: findMessage.userID }, {
				$inc: {
					otherCount: 1
				},
				$set: {
					author: msg[0].member?.nickname ?? msg[0].author.username,
					lastTimestamp: msg[0].createdTimestamp,
					lastTimestampReadable: new Date(msg[0].createdTimestamp),
					active: 1
				}
			})
		}

		// Dupe call logging
		let mes = await message.channel.messages.fetch({ limit: 10 })
		mes = mes.filter(m => {
			if (m.reactions.cache.has('☠️')) return undefined
			else return mes
		})
		const log = [...mes.values()]
		for (const msgs in log) {
			const authorName = log[msgs].member?.displayName
			const userId = log[msgs].author.id
			if (authorName === null) return
			await db.collection.findOneAndUpdate({ _id: message.guild.id },
				{
					$addToSet: {
						'merchChannel.otherMessages': {
							$each: [{
								messageID: log[msgs].id,
								content: log[msgs].content,
								time: log[msgs].createdTimestamp,
								author: authorName,
								userID: userId
							}]
						}
					}
				}
			)
		}
	} catch (e) {
		channels.errors.send(e)
	}
}
