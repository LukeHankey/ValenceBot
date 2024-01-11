import { codeBlock } from 'discord.js'
import { splitMessage } from '../functions.js'

/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

export default {
	name: 'db',
	description: ['Looks stuff up in the database'],
	usage: ['<code>'],
	guildSpecific: ['668330890790699079'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorO)
		const db = client.database.settings

		const [identifier, project] = args
		if (!identifier) return message.channel.send('Make sure there is an identifier.')
		if (identifier === 'all') {
			const info = await db.find({}).toArray()
			const IDs = info.map((data) => {
				return `${data._id} - ${data.serverName}`
			})
			const content = `All server IDs\n\n+ ${IDs.join('\n+ ')}`
			return splitMessage(content).forEach((msgContent) => message.channel.send({ content: codeBlock('diff', msgContent) }))
		}

		let result
		let content

		switch (project) {
			case 'serverName':
				result = await db.findOne({ _id: identifier }, { projection: { serverName: 1 } })
				content = codeBlock('diff', `${result._id}\n\n+ ${result.serverName}`)
				message.channel.send({ content })
				break
			case 'prefix':
				result = await db.findOne({ _id: identifier }, { projection: { prefix: 1 } })
				content = codeBlock('diff', `- ${result._id}\n\n+ ${result.prefix}`)
				message.channel.send({ content })
				break
			case 'roles':
				{
					result = await db.findOne({ _id: identifier }, { projection: { roles: 1 } })
					let roles = Object.entries(result.roles)
					roles = roles.map(([role, id]) => {
						return `${role} - ${id}`
					})
					content = codeBlock('diff', `- ${result._id}\n\n+ ${roles.join('\n+ ')}`)
					message.channel.send({ content })
				}
				break
			case 'channels':
				{
					result = await db.findOne({ _id: identifier }, { projection: { channels: 1 } })
					let channels = Object.entries(result.channels)
					channels = channels.map(([ch, id]) => {
						return `${ch} - ${id}`
					})
					content = codeBlock('diff', `- ${result._id}\n\n+ ${channels.join('\n+ ')}`)
					message.channel.send({ content })
				}
				break
		}
	}
}
