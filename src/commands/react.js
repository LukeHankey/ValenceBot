export default {
	name: 'react',
	description: ['Adds a reaction to a users message.'],
	aliases: [''],
	usage: ['<member> <reaction>'],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	run: async (client, message, args, perms, db) => {
		if (!perms.admin) return message.channel.send(perms.errorA)

		const [member, reaction] = args
		const getMemberId = (member) => {
			let memberId = member
			if (member.includes('<') && member.includes('>')) {
				;[memberId] = member.match(/\d{18,19}/g)
			}

			return memberId
		}
		if (!member || !reaction) return message.channel.send({ content: 'You must specify a member and reaction.' })
		if (await message.guild.members.fetch(getMemberId(member))) {
			await db.collection.updateOne(
				{ _id: message.guild.id },
				{
					$addToSet: {
						memberReact: { member: getMemberId(member), reaction, setupMember: message.author.id, url: message.url }
					}
				}
			)
		}
	}
}
