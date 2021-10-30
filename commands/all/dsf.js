/* eslint-disable no-shadow */
/* eslint-disable no-useless-escape */
import { nEmbed, checkNum } from '../../functions.js'
import { cream, cyan } from '../../colors.js'
import { getDb } from '../../mongodb.js'
import { ScouterCheck } from '../../classes.js'
import { removeMessage } from '../../functions.js'

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 420803245758480405 - DSF
 */

export default {
	name: 'dsf',
	description: ['Displays all of the current stored messages.', 'Clears all of the current stored messages.', 'Shows the list of potential scouters/verified scouters with the set scout count, or count adjusted.', 'Add 1 or <num> merch/other/game count to the member provided.', 'Remove 1 or <num> merch/other/game count to the member provided.', 'Displays all of the current stored messages where reacts need to be cleared.', 'Clears all of the current stored messages where reacts are older than 1 hour.'],
	aliases: [],
	usage: ['messages', 'messages clear', 'view scouter/verified <num (optional)>', 'user memberID/@member add <num (optional)> <other/game>', 'user memberID/@member remove <num (optional)> <other/game>', 'reacts', 'reacts clear'],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Admin',
	run: async (client, message, args, perms, channels) => {
		if (!perms.admin) return message.channel.send(perms.errorA)
		const db = getDb()
		const settings = db.collection('Settings')

		switch (args[0]) {
		case 'm':
		case 'messages':
			switch (args[1]) {
			default: {
				try {
					const { merchChannel: { messages, channelID } } = await settings.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.messages': 1, 'merchChannel.channelID': 1 } })
					const fields = []
					const embed = nEmbed('List of messages currently stored in the DB',
						'There shouldn\'t be too many as they get automatically deleted after 10 minutes. If the bot errors out, please clear all of them using \`;dsf messages clear\`.',
						cream,
						message.member.user.displayAvatarURL(),
						client.user.displayAvatarURL())

					for (const values of messages) {
						let date = new Date(values.time)
						date = date.toString().split(' ')
						fields.push({ name: `${values.author}`, value: `**Time:** ${date.slice(0, 5).join(' ')}\n**Content:** [${values.content}](https://discordapp.com/channels/${message.channel.guild.id}/${channelID}/${values.messageID} 'Click me to go to the message.')`, inline: false })
					}
					return message.channel.send({ embeds: [embed.addFields(fields)] })
				} catch (e) {
					if (e.code === 50035) {
						return message.channel.send({ content: 'Too many messages stored. Use the clear command.' })
					} else { channels.errors.send(e, module) }
				}
			}
				break
			case 'clear':
				await settings.findOneAndUpdate({ _id: message.channel.guild.id },
					{
						$pull: {
							'merchChannel.messages': { time: { $gt: 0 } }
						}
					}
				)
				message.react('✅')
			}
			break
		case 'reacts': {
			switch (args[1]) {
			case 'clear': {
				const { merchChannel: { channelID, spamProtection } } = await settings.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.spamProtection': 1, 'merchChannel.channelID': 1 } })
				const channel = client.channels.cache.get(channelID)

				spamProtection.forEach(async (msgObj) => {
					try {
						const m = await channel.messages.fetch(msgObj.messageID)

						// Remove all reactions if there is > 1 or 0. Then add a skull.
						if (Date.now() - m.createdTimestamp >= 3600000 && (m.reactions.cache.size > 1 || m.reactions.cache.size === 0)) {
							await m.reactions.removeAll()
							await removeMessage(message, m, settings)
							await message.react('✅')
							return await m.react('☠️')
						}
						// If there is only a skull, remove users and message from DB
						else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && m.reactions.cache.has('☠️')) {
							await removeMessage(message, m, settings)
							await m.reactions.removeAll()
							await message.react('✅')
							return await m.react('☠️')
						}
						// If there is a single reaction which is not the Skull, then remove that and react with skull. Repeat process over.
						else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && !m.reactions.cache.has('☠️')) {
							await m.reactions.removeAll()
							await removeMessage(message, m, settings)
							await message.react('✅')
							return await m.react('☠️')
						} else { return await message.react('❌') }
					} catch (e) {
						if (e.code === 10008) {
							const messageID = e.path.split('/')[4]
							await settings.updateOne({ _id: message.channel.guild.id }, {
								$pull: {
									'merchChannel.spamProtection': { messageID: messageID }
								}
							})
						} else { channels.errors.send(e, module) }
					}
				})
			}
				break
			default: {
				const { merchChannel: { spamProtection, channelID } } = await settings.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.spamProtection': 1, 'merchChannel.channelID': 1 } })
				let page = 0
				const fields = []

				for (const values of spamProtection) {
					let date = new Date(values.time)
					date = date.toString().split(' ')
					fields.push({ name: `${values.author}`, value: `**Time:** ${date.slice(0, 5).join(' ')}\n**Content:** [${values.content}](https://discordapp.com/channels/${message.channel.guild.id}/${channelID}/${values.messageID} 'Click me to go to the message.')`, inline: false })
				}
				const paginate = (dataFields) => {
					const pageEmbeds = []
					const data = dataFields
					let k = 12
					for (let i = 0; i < data.length; i += 12) {
						const current = data.slice(i, k)
						k += 12
						const info = current
						const embed = nEmbed('List of reaction messages currently stored in the DB that have had reactions added too',
							'There may be quite a few and if there are, clear them out using \`;dsf reacts clear\`.',
							cream,
							message.member.user.displayAvatarURL(),
							client.user.displayAvatarURL())
						embed.setTimestamp().addFields(info)
						pageEmbeds.push(embed)
					}
					return pageEmbeds
				}
				const embeds = paginate(fields)
				if (!embeds.length) {
					return message.channel.send({ content: 'There are no messages stored that have reactions added.' })
				}

				return message.channel.send({ embeds: [embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`)] })
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
									msg.edit({ embeds: [embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`)] })
								}
							} else if (r.emoji.name === '◀️') {
								if (page !== 0) {
									msg.reactions.resolve('◀️').users.remove(u.id)
									--page
									msg.edit({ embeds: [embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`)] })
								} else { msg.reactions.resolve('◀️').users.remove(u.id) }
							}
						})
					})
					.catch(err => {
						channels.errors.send(err, module)
					})
			}
			}
		}
			break
		case 'view': {
			let scout = new ScouterCheck('Scouter')
			let vScout = new ScouterCheck('Verified Scouter')

			// eslint-disable-next-line no-shadow
			const classVars = async (name, serverName, db) => {
				name._client = client
				name._guild_name = serverName
				name._db = await db.map(doc => {
					if (doc.serverName === name._guild_name) return doc
				}).filter(x => x)[0]
				return name._client && name._guild_name && name._db
			}
			const res = await settings.find({}).toArray()
			await classVars(vScout, message.channel.guild.name, res)
			await classVars(scout, message.channel.guild.name, res)
			const num = args[2]

			switch (args[1]) {
			case 'scouter':
				if (num) {
					scout = new ScouterCheck('Scouter', parseInt(num))
					await classVars(scout, message.channel.guild.name, res)
					scout.send(message.channel.id)
				} else {
					const scoutCheck = await scout._checkForScouts()
					if (!scoutCheck.length) {
						message.channel.send({ content: 'None found.' })
					} else { return scout.send(message.channel.id) }
				}
				break
			case 'verified':
				if (num) {
					vScout = new ScouterCheck('Verified Scouter', parseInt(num))
					await classVars(vScout, message.channel.guild.name, res)
					vScout.send(message.channel.id)
				} else {
					const verifiedCheck = await vScout._checkForScouts()
					if (!verifiedCheck.length) {
						message.channel.send({ content: 'None found.' })
					} else { return vScout.send(message.channel.id) }
				}
				break
			default:
				return message.channel.send({ content: 'You can view either \`scouter\` or \`verified\`' })
			}
		}
			break
		case 'user': {
			// eslint-disable-next-line prefer-const
			let [userID, param, num] = args.slice(1)
			const cacheCheck = async (user) => {
				if (!message.channel.guild.members.cache.has(user)) {
					return await message.channel.guild.members.fetch(user)
						.then(() => true)
						.catch(() => false)
				} else {
					return true
				}
			}
			const checkMem = cacheCheck(userID)
			const reaction = await checkMem
			// eslint-disable-next-line no-self-assign
			checkNum(userID) && checkMem ? userID = userID : userID = undefined
			const userMention = message.mentions.members.first()?.user.id ?? userID

			if (userMention === undefined) return message.channel.send({ content: 'Please provide a valid member ID or member mention.' })
			switch (param) {
			case 'add':
				if (!num) {
					await settings.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.count': 1
						}
					})
					if (reaction) return message.react('✅')
					else return message.react('❌')
				} else if (num === 'other') {
					await settings.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.otherCount': 1
						}
					})
					if (reaction) return message.react('✅')
					else return message.react('❌')
				} else if (num === 'game') {
					await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.game': 1
						}
					})
					if (reaction) return message.react('✅')
					else return message.react('❌')
				} else {
					if (isNaN(parseInt(num))) {
						return message.channel.send({ content: `\`${num}\` is not a number.` })
					} else { num = +num }
					const other = args.slice(4)
					if (other[0] === 'other') {
						await settings.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
							$inc: {
								'merchChannel.scoutTracker.$.otherCount': +num
							}
						})
						if (reaction) return message.react('✅')
						else return message.react('❌')
					} else {
						await settings.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
							$inc: {
								'merchChannel.scoutTracker.$.count': +num
							}
						})
						if (reaction) return message.react('✅')
						else return message.react('❌')
					}
				}
			case 'remove':
				if (!num) {
					await settings.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.count': -1
						}
					})
					if (reaction) return message.react('✅')
					else return message.react('❌')
				} else if (num === 'other') {
					await settings.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.otherCount': -1
						}
					})
					if (reaction) return message.react('✅')
					else return message.react('❌')
				} else if (num === 'game') {
					await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.game': -1
						}
					})
					if (reaction) return message.react('✅')
					else return message.react('❌')
				} else {
					if (isNaN(parseInt(num))) {
						return message.channel.send(`\`${num}\` is not a number.`)
					} else { num = +num }
					const other = args.slice(4)
					if (other[0] === 'other') {
						await settings.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
							$inc: {
								'merchChannel.scoutTracker.$.otherCount': -num
							}
						})
						if (reaction) return message.react('✅')
						else return message.react('❌')
					} else {
						await settings.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
							$inc: {
								'merchChannel.scoutTracker.$.count': -num
							}
						})
						if (reaction) return message.react('✅')
						else return message.react('❌')
					}
				}
			default:
				return message.channel.send({ content: 'Valid params are `add` or `remove`.' })
			}
		}
		default:
			return message.channel.send({
				embeds: [nEmbed(
					'**DSF Admin Commands List**',
					'Here\'s a list of all the DSF commands you can use. Any parameter(s) in \`<>\` are optional:\n\n\`messages|m\`\n\`messages|m clear\`\n\`view scouter <num>\`\n\`view verified <num>\`\n\`user memberID/@member add <other/game> <num>\`\n\`user memberID/@member remove <other/game> <num>\`\n\`reacts\`\n\`reacts clear\`',
					cyan,
					client.user.displayAvatarURL()
				)]
			})
		}
	}
}
