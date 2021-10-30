import { nEmbed } from '../../functions.js'
import { getDb } from '../../mongodb.js'
import { gold } from '../../colors.js'
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
		if (!perms.admin) return message.channel.send(perms.errorA)
		if (!args[0]) return message.channel.send({ content: 'Please provide a User ID' })
		const db = getDb()
		const settingsColl = db.collection('Settings')

		const val = await settingsColl.findOne({ _id: '420803245758480405' })
		const fields = []
		const dataIndex = val.merchChannel.scoutTracker.findIndex(mem => {
			return mem.userID === args[0]
		})
		const allData = val.merchChannel.scoutTracker.length
		const member = val.merchChannel.scoutTracker.filter(mem => mem.userID === args[0])
		val.merchChannel.scoutTracker.filter(mem => {
			if (mem.userID === args[0]) {
				const date = (when) => {
					// eslint-disable-next-line no-shadow
					let date = new Date(when)
					date = date.toString().split(' ')
					return date.slice(0, 5).join(' ')
				}
				fields.push({
					name: '\u200b',
					value: `**firstTimestamp:** ${mem.firstTimestamp}\n**firstTimestampReadable:** ${date(mem.firstTimestampReadable)}\n**lastTimestamp:** ${mem.lastTimestamp}\n**lastTimestampReadable:** ${date(mem.lastTimestampReadable)}\n**Merch count:** ${mem.count}\n**Other count:** ${mem.otherCount}\n**Active for:** ${ms(mem.lastTimestamp - mem.firstTimestamp)}`,
					inline: true
				})
			}
		})

		if (member[0]) {
			const embed = nEmbed(`Diagnostic DB Lookup - ${member[0].author} [${dataIndex}/${allData}]`, 'Testing command to lookup user info for DSF in DB.', gold)
			return message.channel.send({ embeds: [embed.addFields(fields)] })
		} else {
			message.channel.send({ content: 'No profile found for this ID.' })
		}
	}
}
