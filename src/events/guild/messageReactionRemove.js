export default async (client, reaction, user) => {
	const db = client.database.settings
	const message = reaction.message

	if (message.partial) await message.fetch()
	const database = await db.findOne({ _id: `${message.guild.id}` })
	if (database.events === undefined) return
	const data = database.events.filter((m) => m.messageID === message.id)

	if (!data.length || user.bot) return
	if (reaction.emoji.name === '📌') {
		const userFetch = await message.guild.members.fetch(user.id)
		userFetch.roles.remove(data[0].roleID)
		await db.findOneAndUpdate(
			{ _id: message.guild.id, 'events.messageID': data[0].messageID },
			{ $pull: { 'events.$.members': user.id } }
		)
	}
}
