import cron from 'node-cron'

export const otherTimer = (message, db) => {
// Checking the DB and marking dead calls
	cron.schedule('*/5 * * * *', async () => {
		const channels = await db.channels
		const { merchChannel: { otherMessages } } = await db.collection.findOne({ _id: message.guild.id }, { projection: { 'merchChannel.otherMessages': 1 } })
		for await (const { messageID, time } of otherMessages) {
			try {
				if (Date.now() - time > 600_000) {
					await db.collection.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.otherMessages': { messageID } } })
				}
			} catch (e) {
				if (e.code === 10008) {
					const errorMessageID = e.url.split('/')[8]
					return await db.collection.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.otherMessages': { messageID: errorMessageID } } })
				} else { return channels.errors.send(e) }
			}
		}
	})
}
