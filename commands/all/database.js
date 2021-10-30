import { getDb } from '../../mongodb.js'
import { Formatters } from 'discord.js'

/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

export default {
	name: 'db',
	description: ['Looks stuff up in the database'],
	aliases: [''],
	usage: ['<code>'],
	guildSpecific: ['668330890790699079'],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorO)

		const db = getDb()
		const settingsColl = await db.collection('Settings')

		const [identifier, project] = args
		if (!identifier) return message.channel.send('Make sure there is an identifier.')
		if (identifier === 'all') {
			const info = await settingsColl.find({}).toArray()
			const IDs = info.map(data => { return `${data._id} - ${data.serverName}` })
			const content = Formatters.codeBlock('diff', `All server IDs\n\n+ ${IDs.join('\n+ ')}`)
			return message.channel.send({ content })
		}

		let result
		let content

		switch (project) {
		case 'serverName':
			result = await settingsColl.findOne({ _id: identifier }, { projection: { serverName: 1 } })
			content = Formatters.codeBlock('diff', `${result._id}\n\n+ ${result.serverName}`)
			message.channel.send({ content })
			break
		case 'prefix':
			result = await settingsColl.findOne({ _id: identifier }, { projection: { prefix: 1 } })
			content = Formatters.codeBlock('diff', `- ${result._id}\n\n+ ${result.prefix}`)
			message.channel.send({ content })
			break
		case 'roles': {
			result = await settingsColl.findOne({ _id: identifier }, { projection: { roles: 1 } })
			let roles = Object.entries(result.roles)
			roles = roles.map(([role, id]) => { return `${role} - ${id}` })
			content = Formatters.codeBlock('diff', `- ${result._id}\n\n+ ${roles.join('\n+ ')}`)
			message.channel.send({ content })
		}
			break
		case 'channels': {
			result = await settingsColl.findOne({ _id: identifier }, { projection: { channels: 1 } })
			let channels = Object.entries(result.channels)
			channels = channels.map(([ch, id]) => { return `${ch} - ${id}` })
			content = Formatters.codeBlock('diff', `- ${result._id}\n\n+ ${channels.join('\n+ ')}`)
			message.channel.send({ content })
		}
			break
		}
	}
}
