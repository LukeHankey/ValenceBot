import { MongoCollection } from '../../DataBase.js'

export default async (client, guild) => {
	const db = new MongoCollection('Settings')
	const channels = await db.channels
	try {
		await db.collection.deleteOne({ _id: `${guild.id}` })
		const owner = await guild.fetchOwner()

		channels.logs.send(`The bot has left **${guild.name}**. The bot is in a total of ${client.guilds.cache.size} servers.
    \n\`\`\`diff\n+ Server name: ${guild.name}
+ Server ID: ${guild.id}
+ Owner: ${owner.nickname}
+ Channel count: ${guild.channels.cache.size}
+ Member count: ${guild.memberCount}\`\`\``)
	} catch (err) {
		channels.errors.send(err)
	}
}
