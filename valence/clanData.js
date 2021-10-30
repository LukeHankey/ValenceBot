import { getDb } from '../mongodb.js'
import { MessageEmbed } from 'discord.js'
import { redDark } from '../colors.js'

const clanRoles = {
	recruit: '473234580904607745',
	corporal: '473234334342578198',
	sergeant: '473233680161046528',
	lieutenant: '473233520773300257',
	captain: '473233412925292560',
	general: '473232083628720139'
}
const guestRole = '473265487581544448'
const adminRoles = ['Admin', 'Organiser', 'Coordinator', 'Overseer', 'Deputy Owner', 'Owner']
const setRoles = async (member, newRole, oldRole) => {
	await member.roles.add(newRole)
	await member.roles.remove(oldRole.id)
}

const updateRoles = async (client, dbCheck) => {
	const db = getDb()
	const usersColl = await db.collection('Users')
	const errors = client.channels.cache.get('860930368994803732')

	const channels = {
		errors: {
			id: errors.id,
			embed: function (err, module) {
				const fileName = module.id.split('\\').pop()
				const embed = new MessageEmbed()
					.setTitle(`An error occured in ${fileName}`)
					.setColor(redDark)
					.addField(`${err.message}`, `\`\`\`${err.stack}\`\`\``)
				return embed
			},
			send: function (...args) {
				const channel = client.channels.cache.get(this.id)
				return channel.send({ embeds: [this.embed(...args)] })
			}
		}
	}

	if (adminRoles.includes(dbCheck.clanRank) || !dbCheck.discActive || dbCheck.alt) { } else {
		// Valence Server
		const server = client.guilds.cache.get('472448603642920973')
		const getMember = server.members.cache.get(dbCheck.discord) ?? await server.members.fetch(dbCheck.discord).catch(async err => {
			channels.errors.send(err, module)
			return await usersColl.updateOne({ clanMate: dbCheck.clanMate }, { $set: { discActive: false } })
		})
		if (getMember.size) return errors.send({ content: `\`${dbCheck.clanMate}\` loaded a collection with discord id: \`${dbCheck.discord === '' ? 'Empty string' : dbCheck.discord}\` and active set to \`${dbCheck.discActive}\`.` })
		let role = getMember.roles.cache.filter(r => {
			const keys = Object.keys(clanRoles)
			return keys.find(val => r.name.toLowerCase() === val)
		})
		if (!role.size) return getMember.roles.add(guestRole)
		if (role.size > 1) return errors.send({ content: `${getMember} (${getMember.id}) has more than 1 rank role.` })
		role = role.first()
		if (role.name !== dbCheck.clanRank) {
			switch (dbCheck.clanRank) {
			case 'General':
				await setRoles(getMember, clanRoles.general, role)
				console.log('General:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Captain':
				await setRoles(getMember, clanRoles.captain, role)
				console.log('Captain:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Lieutenant':
				await setRoles(getMember, clanRoles.lieutenant, role)
				console.log('Lieutenant:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Sergeant':
				await setRoles(getMember, clanRoles.sergeant, role)
				console.log('Sergeant:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Corporal':
				await setRoles(getMember, clanRoles.corporal, role)
				console.log('Corporal:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Recruit':
				await setRoles(getMember, clanRoles.recruit, role)
				console.log('Recruit:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			}
		} else { }
	}
}

export default updateRoles
