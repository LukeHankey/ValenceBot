const addOtherCount = async (message, db) => {
	// Adds count for other events channel
	const channels = await db.channels
	try {
		const { merchChannel: { scoutTracker } } = await db.collection.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.scoutTracker': 1 } })
		const mesOne = await message.channel.messages.fetch({ limit: 1 })
		const logOne = [...mesOne.values()]
		const msg = logOne.map(val => val)

		const findMessage = await scoutTracker.find(x => x.userID === msg[0].author.id)
		if (!findMessage) {
			console.log(`New other: ${msg[0].author.username} (${message.content})`, msg[0].author.id)
			await db.collection.findOneAndUpdate({ _id: message.channel.guild.id },
				{
					$addToSet: {
						'merchChannel.scoutTracker': {
							$each: [{
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
							}]
						}
					}
				})
		} else {
			console.log(`Old other: ${msg[0].author.username} (${message.content})`, msg[0].author.id)
			await db.collection.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
				$inc: {
					'merchChannel.scoutTracker.$.otherCount': 1
				},
				$set: {
					'merchChannel.scoutTracker.$.author': msg[0].member?.nickname ?? msg[0].author.username,
					'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
					'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
					'merchChannel.scoutTracker.$.active': 1
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
			await db.collection.findOneAndUpdate({ _id: message.channel.guild.id },
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

export default addOtherCount
