import { MongoCollection } from '../DataBase.js'
import { nEmbed } from '../functions.js'
import Color from '../colors.js'
import ms from 'pretty-ms'

/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

export default {
	name: 'lookup',
	description: [''],
	aliases: ['lu'],
	usage: [''],
	guildSpecific: ['420803245758480405', '668330890790699079'],
	permissionLevel: 'Admin',
	run: async (client, message, args, perms) => {
		const db = new MongoCollection('ScoutTracker')
		if (!perms.admin) return message.channel.send(perms.errorA)
		if (!args[0]) return message.channel.send({ content: 'Please provide a User ID' })

		const date = (when) => {
			let date = new Date(when)
			date = date.toString().split(' ')
			return date.slice(0, 5).join(' ')
		}

		const user = await db.collection.findOne({ userID: args[0] }, { projection: { _id: 0 } })
		if (!user) return message.channel.send({ content: `<@!${args[0]}> is not in the database.` })
		console.log(user)

		if (!user.warnings) {
			user.warnings = []
		}

		const allData = await db.collection.countDocuments({})
		const embedFields = [{
			name: '\u200b',
			value: `**firstTimestamp:** ${user.firstTimestamp}\n**firstTimestampReadable:** ${date(user.firstTimestampReadable)}\n**lastTimestamp:** ${user.lastTimestamp}\n**lastTimestampReadable:** ${date(user.lastTimestampReadable)}\n**Merch count:** ${user.count}\n**Other count:** ${user.otherCount}\n**Active for:** ${ms(user.lastTimestamp - user.firstTimestamp)}\n**Active:** ${user.active ? 'True' : 'False'}\n**Warnings:** ${user.warnings.length}`,
			inline: true
		}]

		if (user) {
			const embed = nEmbed(`DB Lookup - ${user.author} [${allData}]`, 'Lookup user info for DSF in the Scouter DataBase.', Color.gold)
			return message.channel.send({ embeds: [embed.addFields(embedFields)] })
		} else {
			message.channel.send({ content: 'No profile found for this ID.' })
		}
	}
}
