import { MongoCollection } from '../../DataBase.js'
const db = new MongoCollection('Settings')

export default async (client, reaction, user) => {
	const message = reaction.message

	if (message.partial) await message.fetch()
	const database = await db.collection.findOne({ _id: `${message.channel.guild.id}` })
	if (database.events === undefined) return
	const data = database.events.filter(m => m.messageID === message.id)

	if (!data.length || user.bot) return
	if (reaction.emoji.name === '📌') {
		const userFetch = await message.channel.guild.members.fetch(user.id)
		userFetch.roles.remove(data[0].roleID)
		await db.collection.findOneAndUpdate({ _id: message.channel.guild.id, 'events.messageID': data[0].messageID }, { $pull: { 'events.$.members': user.id } })
	}
}
