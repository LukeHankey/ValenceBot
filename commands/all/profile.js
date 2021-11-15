/* eslint-disable no-shadow */
/* eslint-disable no-inline-comments */
import { MessageEmbed } from 'discord.js'
import { aqua } from '../../colors.js'
import ms from 'pretty-ms'
import { checkNum, paginate, paginateFollowUP, capitalise } from '../../functions.js'

export default {
	name: 'profile',
	description: ['Displays the members profile if one is found, otherwise has the option of creating one.', 'Displays the specified members profile if one is found.', 'Displays either the specified members profiile or everyone who has <@role>', 'Shows the top 25 in terms of scout count.', 'Shows the top 25 in terms of activity within the last 31 days.', 'Shows the top 25, per page, in terms of inactivity. No calls made within the last 31 days.'],
	aliases: ['p'],
	usage: ['', '<member ID>', '<@member/@role>', 'all', 'active', 'inactive'],
	guildSpecific: ['420803245758480405', '668330890790699079'],
	permissionLevel: 'Everyone',
	run: async (client, message, args, perms, db) => {
		const channels = await db.channels
		const memberID = message.member.id
		const data = await db.collection.findOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': memberID }, { projection: { 'merchChannel.scoutTracker': 1 } })
		const botRole = message.channel.guild.me.roles.cache.find(r => r.managed)
		const memberRoles = message.member.roles.highest.position

		const sendUserInfo = async (id = memberID, uData = { scoutTracker: data.merchChannel.scoutTracker }) => {
			const fetchedMember = await message.channel.guild.members.fetch(id)
			const embed = new MessageEmbed()
				.setTitle(`Member Profile - ${id}`)
				.setDescription('Current tracked stats in this server.')
				.setColor(aqua)
				.setThumbnail(message.author.displayAvatarURL())
				.setFooter('Something wrong or missing? Let a Moderator+ know!', client.user.displayAvatarURL())
				.setTimestamp()
			const userData = uData.scoutTracker.filter(mem => mem.userID === id)
			const memberAssignedRoles = fetchedMember.roles.cache.filter(r => r.id !== message.channel.guild.id && r.position > botRole.position).sort((a, b) => b.position - a.position).map(role => `<@&${role.id}>`)
			const memberSelfRoles = fetchedMember.roles.cache.filter(r => r.id !== message.channel.guild.id && r.position < botRole.position).map(role => `<@&${role.id}>`)
			const fields = []

			if (!userData.length) return message.channel.send({ content: `\`${fetchedMember.nickname ?? fetchedMember.user.username}\` does not have a profile.` })

			function _text (text) {
				const code = '```'
				return `${code}fix\n${text}${code}`
			}

			for (const values of userData) {
				fields.push(
					{ name: `${values.author}`, value: `Merch count: ${values.count}\nOther count: ${values.otherCount}\nGame count: ${values.game}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true },
					{ name: 'Assigned Roles:', value: `${memberAssignedRoles.join(', ') || _text('None')}`, inline: true },
					{ name: '\u200B', value: '\u200B', inline: true },
					{ name: 'Self-Assign Roles:', value: `${memberSelfRoles.join(', ') || _text('None')}`, inline: true }
					// Think about if there is anything else to view in the user profile stats
				)
			}
			return message.channel.send({ embeds: [embed.addFields(fields)] })
		}

		const sendRoleInfo = async (id, rData = { scoutTracker: data.merchChannel.scoutTracker }) => {
			const roleObj = message.channel.guild.roles.cache.get(id)
			const embed = new MessageEmbed()
				.setTitle(`Member Profiles - ${roleObj.name}`)
				.setDescription('Current tracked stats in this server.')
				.setColor(aqua)
				.setThumbnail(message.author.displayAvatarURL())
				.setFooter('Something wrong or missing? Let a Moderator+ know!', client.user.displayAvatarURL())
				.setTimestamp()

			const fetchRole = message.channel.guild.roles.cache.get(id) ?? await message.channel.guild.roles.fetch(id)
			const allMem = await message.channel.guild.members.fetch()
			const fetchAllMem = allMem.filter(mem => mem.roles.cache.find(r => r.id === roleObj.id))
			const memCollection = fetchAllMem.map(mem => mem.id) || fetchRole.members.map(mem => mem.id)

			if (botRole.position > roleObj.position) return message.channel.send({ content: `You can't view the stats for \`${roleObj.name}\`.` }) // Self-assign roles
			if (roleObj.position > memberRoles) return message.channel.send({ content: `You don't have permission to view the stats for \`${roleObj.name}\`.` }) // Only view their own role set

			let newArr = []
			const fields = []
			memCollection.forEach(id => {
				const x = rData.scoutTracker.filter(mem => {
					if (mem.userID === id) return mem.userID === id
					else return undefined
				})
				newArr.push(x)
			})
			newArr = newArr.flat().sort((a, b) => b.count - a.count)

			for (const values of newArr) {
				fields.push({ name: `${values.author}`, value: `Scout count: ${values.count}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true })
			}
			return message.channel.send({ embeds: [embed.addFields(fields)] })
		}

		if (!args.length) {
			if (data) {
				sendUserInfo()
			} else {
				message.channel.send({ content: 'You don\'t currently have a profile. Would you like to set one up? `Yes/No`' })
				const filter = m => ['yes', 'no'].includes(m.content.toLowerCase()) && m.member.id === message.member.id
				message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] })
					.then(async col => {
						col = col.first()
						if (col.content === 'no') { return undefined } else {
							await db.collection.findOneAndUpdate({ _id: message.channel.guild.id },
								{
									$addToSet: {
										'merchChannel.scoutTracker': {
											userID: col.author.id,
											author: col.member.nickname ?? col.author.username,
											firstTimestamp: col.createdTimestamp,
											firstTimestampReadable: new Date(col.createdTimestamp),
											lastTimestamp: col.createdTimestamp,
											lastTimestampReadable: new Date(col.createdTimestamp),
											count: 0,
											game: 0,
											otherCount: 0,
											assigned: []
										}
									}
								})
							return await col.react('✅') && await message.channel.send({ content: 'Your profile has been created. Re-use the command to view.' })
						}
					})
					.catch(() => {
						message.channel.send({ content: 'Timed out. You took too long to respond - No profile has been created.' })
					})
			}
		} else {
			let userID
			let roleMention
			let userMention

			if (checkNum(args[0])) {
				try {
					userID = message.guild.members.cache.get(args[0]) ?? await message.channel.guild.members.fetch(args[0])
				} catch (err) {
					channels.errors.send(err)
				}
			} else {
				roleMention = message.channel.guild.roles.cache.has(args[0].slice(3, 21))
				userMention = message.mentions.members.first()
			}

			if (userID) {
				memberRoles > botRole.position // members highest role > bots managed role
					? sendUserInfo(args[0])
					: message.channel.send({ content: 'You don\'t have permission to use this command.' })
			} else if (roleMention) {
				const roleID = args[0].slice(3, 21)
				memberRoles > botRole.position
					? sendRoleInfo(roleID)
					: message.channel.send({ content: 'You don\'t have permission to use this command.' })
			} else if (userMention) {
				memberRoles > botRole.position
					? sendUserInfo(userMention.id)
					: message.channel.send({ content: 'You don\'t have permission to use this command.' })
			} else if (args[0] === 'all') {
				const { merchChannel: { scoutTracker } } = await db.collection.findOne({ _id: message.guild.id }, { projection: { 'merchChannel.scoutTracker': 1 } })
				const items = scoutTracker.sort((a, b) => b.count - a.count)
				let fields = []

				for (const values of items) {
					fields.push({ name: `${values.author}`, value: `Merch count: ${values.count}\nOther count: ${values.otherCount}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true })
				}
				fields = fields.slice(0, 100)
				const page = 0
				const embeds = paginate(fields, message, capitalise(args[0].toLowerCase()))

				message.channel.send({ embeds: [embeds[page].setFooter(`Page ${page + 1} of ${embeds.length} - Something wrong or missing? Let a Moderator+ know!`, client.user.displayAvatarURL())] })
					.then(async msg => {
						await paginateFollowUP(msg, message, page, embeds, client)
					})
					.catch(async err => channels.errors.send(err))
			} else if (args[0] === 'active') {
				if (memberRoles < botRole.position) return
				const { merchChannel: { scoutTracker } } = await db.collection.findOne({ _id: message.guild.id }, { projection: { 'merchChannel.scoutTracker': 1 } })
				const items = scoutTracker.filter(profile => profile.active).sort((a, b) => b.count - a.count)
				let fields = []

				for (const values of items) {
					fields.push({ name: `${values.author}`, value: `Merch count: ${values.count}\nOther count: ${values.otherCount}\nActive for: ${ms(values.lastTimestamp - values.firstTimestamp)}`, inline: true })
				}
				fields = fields.slice(0, 100)
				const page = 0
				const embeds = paginate(fields, message, capitalise(args[0].toLowerCase()), args[0].toLowerCase())

				message.channel.send({ embeds: [embeds[page].setFooter(`Page ${page + 1} of ${embeds.length} - Something wrong or missing? Let a Moderator+ know!`, client.user.displayAvatarURL())] })
					.then(async msg => {
						await paginateFollowUP(msg, message, page, embeds, client)
					})
					.catch(async err => channels.errors.send(err))
			} else if (args[0] === 'inactive') {
				if (memberRoles < botRole.position) return
				const { merchChannel: { scoutTracker } } = await db.collection.findOne({ _id: message.guild.id }, { projection: { 'merchChannel.scoutTracker': 1 } })
				const items = scoutTracker.filter(profile => !profile.active).sort((a, b) => a.lastTimestamp - b.lastTimestamp)
				let fields = []

				for (const values of items) {
					fields.push({ name: `${values.author}`, value: `Merch count: ${values.count}\nOther count: ${values.otherCount}\nLast Active: ${values.lastTimestampReadable.toString().split(' ').slice(1, 5).join(' ')}`, inline: true })
				}
				fields = fields.slice(0, 100)
				const page = 0
				const embeds = paginate(fields, message, capitalise(args[0].toLowerCase()), args[0].toLowerCase())

				message.channel.send({ embeds: [embeds[page].setFooter(`Page ${page + 1} of ${embeds.length} - Something wrong or missing? Let a Moderator+ know!`, client.user.displayAvatarURL())] })
					.then(async msg => {
						await paginateFollowUP(msg, message, page, embeds, client)
					})
					.catch(async err => channels.errors.send(err))
			} else {
				message.channel.send({ content: `Unable to find \`${args[0]}\` as a member ID/mention or role mention.` })
			}
		}
	}
}
