export default async (client, oldGuild, newGuild) => {
	const db = client.database.settings

	await db.updateOne(
		{ _id: oldGuild.id },
		{
			$set: { serverName: newGuild.name }
		},
		{ upsert: true }
	)

	await db.findOne({ serverID: oldGuild.id }).then(async () => {
		if (oldGuild.name !== newGuild.name) {
			client.channels.cache.get('731997087721586698')
				.send(`The server name has been changed from ${oldGuild.name} to **${newGuild.name}**.\n\`\`\`diff\n
+ Server Name: ${newGuild.name}
+ Server ID: ${oldGuild.id}\`\`\``)
		}
	})
}
