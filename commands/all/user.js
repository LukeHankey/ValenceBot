import { MessageEmbed } from 'discord.js'
import { checkNum, renameKeys, nEmbed } from '../../functions.js'
import { greenLight, redLight } from '../../colors.js'
import { MongoCollection } from '../../DataBase.js'

export default {
	name: 'user',
	description: ['Lookup a clan member by Discord ID.', 'Lookup a group of ranks.', 'Lookup a clan member by their RSN.', 'Set the Discord ID/Active/Alt status of a clan member.'],
	aliases: [''],
	usage: ['<Discord ID>', '<Rank name>', '<RSN>', '<RSN> set <discord/active/alt> <new value>'],
	guildSpecific: ['472448603642920973', '668330890790699079'],
	permissionLevel: 'Mod',
	run: async (client, message, args, perms, db) => {
		if (!perms.mod) return message.channel.send(perms.errorM)
		const usersColl = new MongoCollection('Users')
		const ranks = ['recruit', 'corporal', 'sergeant', 'lieutenant', 'captain', 'general', 'admin', 'organiser', 'coordinator', 'overseer', 'deputy owner', 'owner']

		const createEmbedForDB = async (user, { inDisc, type }, fields, desc = '') => {
			let member
			if (type === 'id') {
				if (user.discord !== '' && inDisc) {
					member = message.guild.members.cache.get(user.ID) ?? await message.guild.members.fetch(user.ID)
				}
			} else if (type === 'rsn') {
				if (user.discord !== '' && user.discActive) {
					member = message.guild.members.cache.get(user.ID) ?? await message.guild.members.fetch(user.ID)
				}
			} else { return }

			const embed = new MessageEmbed()
				.setTitle(`User Profile - ${user.RSN}`)
				.setThumbnail(member ? member.user.displayAvatarURL() : message.channel.guild.iconURL())
				.setTimestamp()
				.setDescription(desc)
				.setColor(greenLight)
				.setFooter('If any of the data above is wrong, please update it.')
				.addFields(fields)
			return message.channel.send({ embeds: [embed] })
		}

		const createEmbedForNoDB = async (mem, desc) => {
			let member
			if (!desc) member = await message.channel.guild.members.fetch(mem)
			const embed = new MessageEmbed()
				.setTitle('User Profile - Not Found')
				.setDescription(desc || `User with Discord ID: ${mem} not found but they are in the Discord as ${member.toString()}.`)
				.setColor(redLight)
				.setTimestamp()
			return message.channel.send({ embeds: [embed] })
		}
		const result = []

		if (args.length === 1 && checkNum(args[0], 1, Infinity)) {
			// Discord ID
			const userInDiscord = await message.guild.members.fetch(args[0])
			let findUser = await usersColl.findOne({ discord: args[0] }, { projection: { _id: 0, kills: 0 } })
			if (findUser) {
				findUser = renameKeys({ clanMate: 'RSN', clanRank: 'Rank', totalXP: 'Total XP', discord: 'ID', discActive: 'Discord', alt: 'Alt Account', gameActive: 'Game' }, findUser)
				delete findUser.lastUpdated
				for (const item in findUser) {
					if (findUser.ID === '') findUser.ID = 'N/A'
					result.push({ name: item, value: findUser[item].toString(), inline: true })
				}
			}

			if (userInDiscord && findUser) {
				console.log(result)
				await createEmbedForDB(findUser, { inDisc: userInDiscord, type: 'id' }, result)
			} else if (userInDiscord && !findUser) {
				await createEmbedForNoDB(args[0])
			} else if (!userInDiscord && findUser) {
				await createEmbedForDB(findUser, { inDisc: userInDiscord, type: 'id' }, result, 'This person is not in the server but they are in the clan.')
			} else {
				await createEmbedForNoDB(args[0], 'The person with this ID is not in the clan, nor in the server.')
			}
		} else if (args.length >= 1 && ranks.includes(args[0].toLowerCase())) {
			// Find by rank
			const rankArg = args[0].toLowerCase()
			const findGroup = usersColl.find({ $text: { $search: rankArg, $caseSensitive: false } }).project({ _id: 0, kills: 0, totalXP: 0 })
			for await (const doc of findGroup) {
				result.push({ name: doc.clanMate, value: `ID: ${doc.discord}\nActive: ${doc.discActive}\nAlt: ${doc.alt}`, inline: true })
			}

			let page = 0
			const embeds = paginate(result)

			// eslint-disable-next-line no-inner-declarations
			function paginate (pageData) {
				const pageEmbeds = []
				let k = 24
				for (let i = 0; i < pageData.length; i += 24) {
					const current = pageData.slice(i, k)
					k += 24
					const info = current
					const gEmbed = nEmbed(
						`User Profile - ${rankArg}`,
						'A comprehensive list of all clan members within this rank. Active refers to being in this server with a valid Discord ID.',
						greenLight,
						''
					)
						.addFields(info)
					pageEmbeds.push(gEmbed)
				}
				return pageEmbeds
			}

			message.channel.send({ embeds: [embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`)] })
				.then(async msg => {
					await msg.react('◀️')
					await msg.react('▶️')

					const react = (reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === message.author.id
					const collect = msg.createReactionCollector(react)

					collect.on('collect', (r, u) => {
						if (r.emoji.name === '▶️') {
							if (page < embeds.length) {
								msg.reactions.resolve('▶️').users.remove(u.id)
								page++
								if (page === embeds.length) --page
								msg.edit(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`))
							}
						} else if (r.emoji.name === '◀️') {
							if (page !== 0) {
								msg.reactions.resolve('◀️').users.remove(u.id)
								--page
								msg.edit(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`))
							} else { msg.reactions.resolve('◀️').users.remove(u.id) }
						}
					})
				})
				.catch(async err => await db.channels.errors.send(err))
		} else {
			if (!args.length) return
			// Find by rs name
			// eslint-disable-next-line prefer-const
			let [rsName, ...rest] = args
			if (rest.includes('set')) {
				const setIndex = rest.findIndex(s => s === 'set')
				const lastName = rest.slice(0, setIndex)
				const fullRSN = `${rsName} ${lastName.join(' ')}`
				rest = rest.slice(setIndex + 1)
				const [param, ...other] = rest

				const booleanConvert = (string) => {
					if (string === 'true') return true
					else return false
				}
				const { clanMate } = await usersColl.findOne({ $text: { $search: fullRSN, $caseSensitive: false } }, { projection: { _id: 0, clanMate: 1 } })

				switch (param) {
				case 'id':
					await usersColl.updateOne({ clanMate }, { $set: { discord: other.join(' '), discActive: true } })
					return await message.react('✅')
				case 'discord':
				case 'discActive':
					if (other.join(' ') === 'true' || other.join(' ') === 'false') {
						await usersColl.updateOne({ clanMate }, { $set: { discActive: booleanConvert(other.join(' ')) } })
						return await message.react('✅')
					} else { return message.channel.send('Active state must be set as either `true` or `false`.') }
				case 'alt':
					if (other.join(' ') === 'true' || other.join(' ') === 'false') {
						await usersColl.updateOne({ clanMate }, { $set: { alt: booleanConvert(other.join(' ')) } })
						return await message.react('✅')
					} else { return message.channel.send({ content: 'Alt account must be set as either `true` or `false`.' }) }
				default: {
					return message.channel.send({ content: 'Parameters that are able to change are the Discord ID, Discord active status and Alt account status. The parameter names are: `id` | `discord`/`discActive` | `alt`' })
				}
				}
			}
			[...rsName] = args

			let findUser = await usersColl.findOne({ $text: { $search: rsName.join(' '), $caseSensitive: false } }, { projection: { _id: 0, kills: 0 } })
			if (findUser) {
				findUser = renameKeys({ clanMate: 'RSN', clanRank: 'Rank', totalXP: 'Total XP', discord: 'ID', discActive: 'Discord', alt: 'Alt Account', gameActive: 'Game' }, findUser)
				delete findUser.lastUpdated
				for (const item in findUser) {
					if (findUser.ID === '') findUser.ID = 'N/A'
					if (typeof findUser[item] === 'boolean') findUser[item] = `${findUser[item]}`
					result.push({ name: item, value: findUser[item], inline: true })
				}
			}
			if (findUser) {
				if (findUser['Discord Active']) {
					console.log(result)
					await createEmbedForDB(findUser, { inDisc: null, type: 'rsn' }, result)
				} else {
					console.log(result)
					await createEmbedForDB(findUser, { inDisc: null, type: 'rsn' }, result, 'This person is not in the server but they are in the clan.')
				}
			} else {
				await createEmbedForNoDB(...rsName, 'Did not find any clan member by that rsn. Make sure you typed it correctly. If they are a new clan member, they may not have been added yet.')
			}
		}
	}
}
