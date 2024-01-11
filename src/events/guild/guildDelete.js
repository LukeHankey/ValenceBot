export default async (client, guild) => {
	const db = client.database.settings
	const channels = await client.database.channels
	try {
		await db.deleteOne({ _id: `${guild.id}` })

		channels.logs.send(`The bot has left **${guild.name}**. The bot is in a total of ${client.guilds.cache.size} servers.
    \n\`\`\`diff\n+ Server name: ${guild.name}
+ Server ID: ${guild.id}
+ Channel count: ${guild.channels.cache.size}
+ Member count: ${guild.memberCount}\`\`\``)
	} catch (err) {
		channels.errors.send(err)
	}
}
