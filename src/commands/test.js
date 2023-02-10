export default {
	name: 'test',
	description: ['Replies to the specified DM.'],
	aliases: [],
	usage: ['<user ID> <message>'],
	guildSpecific: '668330890790699079',
	permissionLevel: 'Owner',
	run: async (client, message, args, perms, db) => {
		return message.channel.send('Testing')
	}
}
