export default {
	name: 'reply',
	description: ['Replies to the specified DM.'],
	usage: ['<user ID> <message>'],
	guildSpecific: '668330890790699079',
	permissionLevel: 'Owner',
	run: async (client, message, args, perms) => {
		const channels = await client.database.channels
		if (!perms.owner) return message.channel.send(perms.errorO)
		const [userID, ...content] = args

		if (!content.length) return message.channel.send({ content: 'Error: Cannot send an empty message.' })

		client.users
			.fetch(userID)
			.then((user) => {
				user.send({ content: content.join(' ') })
				return message.react('✅')
			})
			.catch(async (e) => {
				if (e.code === 10013) {
					return message.channel.send({ content: `Error: ${e.rawError.message}` })
				} else {
					channels.errors.send(e)
				}
			})
	}
}
