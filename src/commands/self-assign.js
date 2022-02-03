import { greenLight, redLight, cyan } from '../colors.js'
import { MessageEmbed } from 'discord.js'

export default {
	name: 'self-assign',
	description: ['Assigns or removes a role.', 'Shows a full list of self-assignable roles.'],
	aliases: ['sa'],
	usage: ['<role name>', 'roles'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	run: async (client, message, args) => {
		const [...roleName] = args

		const rName = roleName.join(' ').trim()
		let rNameMulti = rName.split(',')
		rNameMulti = rNameMulti.map(x => x.trim().toLowerCase())
		const botRole = message.guild.me.roles.cache.find(r => r.managed)
		const highBotRoleID = botRole.id

		const role = rNameMulti.map(rN => {
			return message.guild.roles.cache.find(roles => {
				return roles.name.toLowerCase() === rN
			})
		})

		let pos = role.map((x, i) => {
			if (x === undefined) return i
			else return undefined
		})
		pos = pos.filter(item => !isNaN(parseInt(item)))
		const wrong = pos.map(v => rNameMulti[v])

		if (!args[0]) {
			return message.channel.send({ content: 'Please provide the role name(s) to add/remove.' })
		}

		const botRoleHighest = message.guild.roles.cache.get(highBotRoleID)
		const botHighest = role.filter(x => {
			if (x === undefined) return undefined
			return botRoleHighest.position > x.position
		})

		const embed = new MessageEmbed()
			.setTitle('Self-Assigned Information')
			.setTimestamp()
			.setColor(greenLight)
			.setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL())

		if (args[0] === 'roles') {
			let allAvailableRoles = []
			// eslint-disable-next-line array-callback-return
			message.guild.roles.cache.filter(allRoles => {
				if (message.guild.id === '472448603642920973') {
					if (allRoles.position < 36) {
						return allAvailableRoles.push(allRoles.name)
					}
				} else if (message.guild.id === '420803245758480405') {
					// DSF
					const reactionRestrict = message.guild.roles.cache.get('881696440747958342')
					if (allRoles.position < reactionRestrict.position) {
						return allAvailableRoles.push(allRoles.name)
					}
				} else if (allRoles.position < botRoleHighest.position) {
					return allAvailableRoles.push(allRoles.name)
				}
			})

			allAvailableRoles = allAvailableRoles
				.filter(name => name !== '@everyone')
				.map(name => `\`${name}\``)
				.sort()
				.join(' | ')

			if (!allAvailableRoles.length) return message.channel.send({ content: 'No roles are assignable as no roles are above my highest role.' })

			return message.channel.send({ embeds: [embed.setColor(cyan).setDescription(`Available roles to add:\n ${allAvailableRoles}`)] })
		}

		const rID = botHighest.map(x => x.id)
		const rNames = botHighest.map(x => x.name)

		const memberRole = message.member.roles
		const added = []
		const removed = []

		rID.forEach(e => {
			memberRole.cache.has(e)
				? memberRole.remove(rID) && removed.push(rNames)
				: memberRole.add(rID) && added.push(rNames)
		})

		const fieldAdd = { name: 'Roles Added:', value: `\`\`\`css\n${!added.length ? 'None' : added[0].join(', ')}\`\`\``, inline: true }
		const fieldRemove = { name: 'Roles Removed:', value: `\`\`\`fix\n${!removed.length ? 'None' : removed[0].join(', ')}\`\`\``, inline: true }
		const wrongAdd = { name: 'Can\'t find:', value: `\`\`\`cs\n'${wrong.join(', ')}'\`\`\``, inline: true }
		const fields = [fieldAdd, fieldRemove]
		const fieldsPlus = [...fields, wrongAdd]

		console.log(added, removed, wrong)

		wrong.length && (!added.length && !removed.length)
			? message.channel.send({ embeds: [embed.setColor(redLight).addFields(wrongAdd).setDescription('Can\'t find the role name? Use `;sa roles` for a full list of self-assignable role names.')] })
			: wrong.length
				? message.channel.send({ embeds: [embed.addFields(fieldsPlus).setDescription('Can\'t find the role name? Use `;sa roles` for a full list of self-assignable role names.')] })
				: message.channel.send({ embeds: [embed.addFields(fields)] })
	}
}
