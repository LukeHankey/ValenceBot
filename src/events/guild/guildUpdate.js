import { MongoCollection } from '../../DataBase.js'

export default async (client, oldGuild, newGuild) => {
	const db = new MongoCollection('Settings')

	await db.collection.updateOne(
		{ _id: oldGuild.id },
		{
			$set: { serverName: newGuild.name }
		},
		{ upsert: true }
	)

	await db.collection.findOne({ serverID: oldGuild.id }).then(async () => {
		if (oldGuild.name !== newGuild.name) {
			client.channels.cache.get('731997087721586698')
				.send(`The server name has been changed from ${oldGuild.name} to **${newGuild.name}**.\n\`\`\`diff\n
+ Server Name: ${newGuild.name}
+ Server ID: ${oldGuild.id}\`\`\``)
		}
	})
}
