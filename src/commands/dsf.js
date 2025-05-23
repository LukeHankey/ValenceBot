/* eslint-disable no-shadow */
/* eslint-disable no-useless-escape */
import { nEmbed, checkNum } from '../functions.js'
import Color from '../colors.js'
import { ScouterCheck } from '../classes.js'
import { classVars } from '../dsf/index.js'

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 420803245758480405 - DSF
 */

export default {
	name: 'dsf',
	description: [
		'Displays all of the current stored messages.',
		'Clears all of the current stored messages.',
		'Displays all of the current stored messages in other-dsf-calls.',
		'Clears all of the current stored messages in other-dsf-calls.',
		'Shows the list of potential scouters/verified scouters with the set scout count, or count adjusted.',
		'Add 1 or <num> merch/other to the member provided.',
		'Remove 1 or <num> merch/other to the member provided.'
	],
	usage: [
		'messages',
		'messages clear',
		'other',
		'other clear',
		'view scouter/verified <num (optional)>',
		'user memberID/@member add <num (optional)> <other>',
		'user memberID/@member remove <num (optional)> <other>'
	],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Admin',
	run: async (client, message, args, perms) => {
		if (!perms.admin) return message.channel.send(perms.errorA)
		const db = client.database.settings
		const channels = await client.database.channels
		const scouters = client.database.scoutTracker

		switch (args[0]) {
			case 'm':
			case 'messages':
				switch (args[1]) {
					// eslint-disable-next-line default-case-last
					default:
						try {
							const {
								merchChannel: { messages, channelID }
							} = await db.findOne(
								{ _id: message.guild.id },
								{ projection: { 'merchChannel.messages': 1, 'merchChannel.channelID': 1 } }
							)
							const fields = []
							const embed = nEmbed(
								'List of messages currently stored in the DB',
								"There shouldn't be too many as they get automatically deleted after 10 minutes. If the bot errors out, please clear all of them using `;dsf messages clear`.",
								Color.cream,
								message.member.user.displayAvatarURL(),
								client.user.displayAvatarURL()
							)

							for (const values of messages) {
								let date = new Date(values.time)
								date = date.toString().split(' ')
								fields.push({
									name: `${values.author}`,
									value: `**Time:** ${date.slice(0, 5).join(' ')}\n**Content:** [${
										values.content
									}](https://discordapp.com/channels/${message.guild.id}/${channelID}/${
										values.messageID
									} 'Click me to go to the message.')`,
									inline: false
								})
							}
							return message.channel.send({ embeds: [embed.addFields(fields)] })
						} catch (e) {
							if (e.code === 50035) {
								return message.channel.send({
									content: 'Too many messages stored. Use the clear command.'
								})
							} else {
								channels.errors.send(e)
							}
						}
						break
					case 'clear':
						await db.findOneAndUpdate(
							{ _id: message.guild.id },
							{
								$pull: {
									'merchChannel.messages': { time: { $gt: 0 } }
								}
							}
						)
						message.react('✅')
				}
				break
			case 'o':
			case 'other':
				switch (args[1]) {
					// eslint-disable-next-line default-case-last
					default:
						try {
							const {
								merchChannel: { otherMessages, otherChannelID }
							} = await db.findOne(
								{ _id: message.guild.id },
								{ projection: { 'merchChannel.otherMessages': 1, 'merchChannel.otherChannelID': 1 } }
							)
							const fields = []
							const embed = nEmbed(
								'List of messages currently stored in the DB',
								"There shouldn't be too many as they get automatically deleted after 10 minutes. If the bot errors out, please clear all of them using `;dsf other clear`.",
								Color.cream,
								message.member.user.displayAvatarURL(),
								client.user.displayAvatarURL()
							)

							for (const values of otherMessages) {
								let date = new Date(values.time)
								date = date.toString().split(' ')
								fields.push({
									name: `${values.author}`,
									value: `**Time:** ${date.slice(0, 5).join(' ')}\n**Content:** [${
										values.content
									}](https://discordapp.com/channels/${message.guild.id}/${otherChannelID}/${
										values.messageID
									} 'Click me to go to the message.')`,
									inline: false
								})
							}
							return message.channel.send({ embeds: [embed.addFields(fields)] })
						} catch (e) {
							if (e.code === 50035) {
								return message.channel.send({
									content: 'Too many messages stored. Use the clear command.'
								})
							} else {
								channels.errors.send(e)
							}
						}
						break
					case 'clear':
						await db.findOneAndUpdate(
							{ _id: message.guild.id },
							{
								$pull: {
									'merchChannel.otherMessages': { time: { $gt: 0 } }
								}
							}
						)
						message.react('✅')
				}
				break
			case 'view':
				{
					const num = isNaN(parseInt(args[2])) ? (args[1] === 'verified' ? 100 : 40) : parseInt(args[2])

					const scout = new ScouterCheck('Scouter', num)
					const vScout = new ScouterCheck('Verified Scouter', num)

					const res = await db.find({}).toArray()
					const scouter = await scouters
						.find({
							$expr: {
								$gte: [
									{
										$add: ['$count', '$alt1.merchantCount', '$alt1First.merchantCount']
									},
									num
								]
							}
						})
						.toArray()
					await classVars(vScout, message.guild.name, res, client, scouter)
					await classVars(scout, message.guild.name, res, client, scouter)

					switch (args[1]) {
						case 'scouter':
							scout.send(message.channel.id)
							break
						case 'verified':
							vScout.send(message.channel.id)
							break
						default:
							return message.channel.send({ content: 'You can view either `scouter` or `verified`' })
					}
				}
				break
			case 'user': {
				// eslint-disable-next-line prefer-const
				let [userID, param, num] = args.slice(1)
				const cacheCheck = async (user) => {
					if (!message.guild.members.cache.has(user)) {
						return await message.guild.members
							.fetch(user)
							.then(() => true)
							.catch(() => false)
					} else {
						return true
					}
				}
				const checkMem = cacheCheck(userID)
				const reaction = await checkMem
				// eslint-disable-next-line no-self-assign
				checkNum(userID) && checkMem ? (userID = userID) : (userID = undefined)
				const userMention = message.mentions.members.first()?.user.id ?? userID

				if (userMention === undefined) {
					return message.channel.send({
						content: 'Please provide a valid member ID or member mention.'
					})
				}
				switch (param) {
					case 'add':
						if (!num) {
							await scouters.updateOne(
								{ userID: userMention },
								{
									$inc: {
										count: 1
									}
								}
							)
							if (reaction) return message.react('✅')
							else return message.react('❌')
						} else if (num === 'other') {
							await scouters.updateOne(
								{ userID: userMention },
								{
									$inc: {
										otherCount: 1
									}
								}
							)
							if (reaction) return message.react('✅')
							else return message.react('❌')
						} else {
							if (isNaN(parseInt(num))) {
								return message.channel.send({ content: `\`${num}\` is not a number.` })
							} else {
								num = +num
							}
							const other = args.slice(4)
							if (other[0] === 'other') {
								await scouters.updateOne(
									{ userID: userMention },
									{
										$inc: {
											otherCount: +num
										}
									}
								)
								if (reaction) return message.react('✅')
								else return message.react('❌')
							} else {
								await scouters.updateOne(
									{ userID: userMention },
									{
										$inc: {
											count: +num
										}
									}
								)
								if (reaction) return message.react('✅')
								else return message.react('❌')
							}
						}
					case 'remove':
						if (!num) {
							await scouters.updateOne(
								{ userID: userMention },
								{
									$inc: {
										count: -1
									}
								}
							)
							if (reaction) return message.react('✅')
							else return message.react('❌')
						} else if (num === 'other') {
							await scouters.updateOne(
								{ userID: userMention },
								{
									$inc: {
										otherCount: -1
									}
								}
							)
							if (reaction) return message.react('✅')
							else return message.react('❌')
						} else {
							if (isNaN(parseInt(num))) {
								return message.channel.send(`\`${num}\` is not a number.`)
							} else {
								num = +num
							}
							const other = args.slice(4)
							if (other[0] === 'other') {
								await scouters.updateOne(
									{ userID: userMention },
									{
										$inc: {
											otherCount: -num
										}
									}
								)
								if (reaction) return message.react('✅')
								else return message.react('❌')
							} else {
								await scouters.updateOne(
									{ userID: userMention },
									{
										$inc: {
											count: -num
										}
									}
								)
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
					embeds: [
						nEmbed(
							'**DSF Admin Commands List**',
							"Here's a list of all the DSF commands you can use. Any parameter(s) in `<>` are optional:\n\n`messages|m`\n`messages|m clear`\n`other|o`\n`other|o clear`\n`view scouter <num>`\n`view verified <num>`\n`user memberID/@member add <other> <num>`\n`user memberID/@member remove <other> <num>`",
							Color.cyan,
							client.user.displayAvatarURL()
						)
					]
				})
		}
	}
}
