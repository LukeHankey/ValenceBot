import { getDb } from '../../mongodb.js'

export default async (client, guild) => {
	const db = getDb()
	const collection = db.collection('Settings')
	const code = '```'

	collection.insertOne(
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
			},
			citadel_reset_time: { hour: '*', minute: '*', day: '*', scheduled: 'false', reminders: [] }
		},
		{ forceServerObjectId: true }
	)

	client.channels.cache.get('731997087721586698').send(`The bot has been added to **${guild.name}**. The bot is in a total of ${client.guilds.cache.size} servers. 
    \n${code}diff\n
+ Server name: ${guild.name}
+ Server ID: ${guild.id}
+ Owner: ${await guild.fetchOwner().nickname ?? guild.fetchOwner().user.username}
+ Channel count: ${guild.channels.cache.size}
+ Member count: ${guild.memberCount}${code}`)
}
