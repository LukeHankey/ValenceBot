export default async (client, guild) => {
	const db = client.database.settings
	await db.insertOne(
		{
			_id: `${guild.id}`,
			serverName: `${guild.name}`,
			prefix: ';',
			roles: {
				modRole: `${guild.roles.highest}`,
				adminRole: `${guild.roles.highest}`,
				defaultAdminRole: `${guild.roles.highest}`
			},
			channels: {
				adminChannel: null,
				modChannel: null,
				eventsChannel: null
			}
		},
		{ forceServerObjectId: true }
	)

	const owner = await guild.fetchOwner()

	client.channels.cache.get('731997087721586698').send({
		content: `The bot has been added to **${guild.name}**. The bot is in a total of ${client.guilds.cache.size} servers.
    \n\`\`\`diff\n
+ Server name: ${guild.name}
+ Server ID: ${guild.id}
+ Owner: ${owner?.user.username}
+ Channel count: ${guild.channels.cache.size}
+ Member count: ${guild.memberCount}\`\`\``
	})
}
