import { MongoCollection } from '../../DataBase.js'
import { MessageEmbed } from 'discord.js'
import { removeMessage, removeEvents } from '../../functions.js'
import { redDark } from '../../colors.js'
import fetch from 'node-fetch'

const db = new MongoCollection('Settings')
const usersDB = new MongoCollection('Users')

export default async (client, reaction, user) => {
	const message = reaction.message
	const channels = await db.channels
	const { _id } = await db.collection.findOne({ _id: message.guild.id })

	if (message.partial) await message.fetch().catch(err => channels.errors.send(err))
	switch (message.guild.id) {
	case _id:
		// Valence
		if (_id === '472448603642920973' | _id === '668330890790699079') {
			if (user.bot) return
			const data = await db.collection.findOne({ _id: message.guild.id }, { projection: { events: 1, channels: 1, calendarID: 1 } })
			const { nameChange } = await db.collection.findOne({ _id: message.guild.id }, { projection: { nameChange: 1, _id: 0 } })

			if (message.channel.id === data.channels.events) {
				const messageMatch = data.events.filter(m => m.messageID === message.id)

				if (!messageMatch.length) return
				if (reaction.emoji.name === '🛑') {
					if (user.id !== message.author.id) {
						return message.reactions.resolve('🛑').users.remove(user.id)
					}

					const [event] = data.events.filter(e => e.messageID === message.id)

					await removeEvents(message, db, 'messageReactionAdd', data, event.eventTag)
				} else if (reaction.emoji.name === '📌') {
					const userFetch = await message.guild.members.fetch(user.id)
					const eventFound = data.events.find(e => e.messageID === message.id)
					userFetch.roles.add(eventFound.roleID)
					await db.collection.findOneAndUpdate({ _id: message.guild.id, 'events.messageID': eventFound.messageID }, { $addToSet: { 'events.$.members': user.id } })
				}
			} else if (message.channel.id === data.channels.adminChannel) {
				const messageMatch = nameChange.find(o => o.messageID === message.id)
				if (messageMatch) {
					let primary = message.content.split('\n')[3]
					const potentialNewNamesList = []
					messageMatch.data[0].potentialNewNames.forEach(item => potentialNewNamesList.push(item.clanMate.toLowerCase()))
					const potentialPreviousName = messageMatch.data[0].clanMate
					let oldData = messageMatch.data.map(o => { return { _id: o._id, clanMate: o.clanMate, clanRank: o.clanRank, totalXP: o.totalXP, kills: o.kills, discord: o.discord, discActive: o.discActive, alt: o.alt, gameActive: o.gameActive } })
					if (reaction.emoji.name === '✅') {
						primary = primary.split(' |')[0]
						const oldProfile = await usersDB.collection.findOne({ clanMate: potentialPreviousName })
						await usersDB.collection.updateOne({ clanMate: primary }, {
							$set: {
								discord: oldProfile.discord,
								discActive: oldProfile.discActive,
								alt: oldProfile.alt,
								gameActive: oldProfile.gameActive
							},
							$unset: {
								potentialNewNames: 1
							}
						}).then(async () => await usersDB.collection.deleteOne({ clanMate: potentialPreviousName }))

						db.collection.updateOne({ _id: message.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } })
						message.edit({ content: `Action: ✅, by: ${user.username}\n${message.content}\nDon't forget to merge their name: <https://rsclanadmin.com/Clan/Manager/Members/245> to update their points.` })
						return message.reactions.removeAll()
					} else if (reaction.emoji.name === '❌') {
						let metricsProfile = await fetch(`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${potentialPreviousName}%22%5D&callback=jQuery000000000000000_0000000000&_=0`).then(response => response.text())
						metricsProfile = JSON.parse(metricsProfile.slice(34, -4))
						const userLeft = await usersDB.collection.findOne({ $text: { $search: potentialPreviousName, $caseSensitive: false } }, { projection: { _id: 0, potentialNewNames: 0, profile: 0 } })

						if (metricsProfile.clan && metricsProfile.clan !== 'Valence') {
							const embed = new MessageEmbed()
								.setTitle(`${userLeft.clanMate} is no longer in Valence`)
								.setDescription(`${user.username} chose ❌ on name changes. (Not changed names or none match). User has been removed from the database.`)
								.setColor(redDark)
								.addField('Users old profile', `\`\`\`${JSON.stringify(userLeft)}\`\`\``)
							const channel = client.channels.cache.get(channels.errors.id)
							channel.send(embed)
							await usersDB.collection.deleteOne({ clanMate: userLeft.clanMate })
						} else {
							// Checks if the potential previous name is equal to the current name.
							let metricsProfile = await fetch(`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${potentialPreviousName}%22%5D&callback=jQuery000000000000000_0000000000&_=0`).then(response => response.text())
							metricsProfile = JSON.parse(metricsProfile.slice(34, -4))
							const userLeft = await usersDB.collection.findOne({ $text: { $search: potentialPreviousName, $caseSensitive: false } }, { projection: { _id: 0, potentialNewNames: 0, profile: 0 } })

							if (metricsProfile.clan && metricsProfile.clan !== 'Valence') {
								const embed = new MessageEmbed()
									.setTitle(`${userLeft.clanMate} is no longer in Valence`)
									.setDescription(`${user.username} chose ❌ on name changes. (Not changed names or none match). User has been removed from the database.`)
									.setColor(redDark)
									.addField('Users old profile', `\`\`\`${JSON.stringify(userLeft)}\`\`\``)
								const channel = client.channels.cache.get(channels.errors.id)
								channel.send(embed)
								await usersDB.collection.deleteOne({ clanMate: userLeft.clanMate })
							} else {
								// Checks if the potential previous name is equal to the current name.
								// eslint-disable-next-line no-lonely-if
								if (userLeft.clanMate === potentialPreviousName) {
									oldData = oldData.find(u => u.clanMate.toLowerCase() === potentialPreviousName.toLowerCase())
									await usersDB.collection.deleteOne({ clanMate: potentialPreviousName })
									await usersDB.collection.insertOne(oldData)
								}
							}
							db.collection.updateOne({ _id: message.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } })
							message.edit({ content: `Action: ❌, by: ${user.username}\n${message.content}` })
							return message.reactions.removeAll()
						}
					} else if (reaction.emoji.name === '📝') {
						try {
							message.channel.send('Please type out one of the above suggested names.')
							const filter = m => potentialNewNamesList.includes(m.content.toLowerCase())
							let msg = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
							msg = msg.first()
							const found = messageMatch.data[0].potentialNewNames.find(u => u.clanMate.toLowerCase() === msg.content.toLowerCase())

							const details = (currentName, previousName) => {
								const result = {}
								if (currentName.discActive || previousName.discActive) {
									result.discActive = true
									currentName.discActive ? result.discord = currentName.discord : result.discord = previousName.discord
								}
								currentName.alt || previousName.alt ? result.alt = true : result.alt = false
								currentName.gameActive || previousName.gameActive ? result.gameActive = true : result.gameActive = false
								return result
							}

							const info = details(found, messageMatch.data[0])
							await usersDB.collection.updateOne({ clanMate: found[0].clanMate }, {
								$set: {
									discord: info.discord,
									discActive: info.discActive,
									alt: info.alt,
									gameActive: info.gameActive
								}
							})
							await usersDB.collection.deleteOne({ clanMate: potentialPreviousName })
							db.collection.updateOne({ _id: message.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } })
							message.edit({ content: `Action: 📝, by: ${user.username}\n${message.content}` })
							return message.reactions.removeAll()
						} catch (err) {
							if (err) return message.channel.send({ content: 'Timed out. Try again.' })
							channels.errors.send(err)
						}
					}
				}
			}
		} else if (_id === '420803245758480405') { // DSF
			const {
				merchChannel: {
					channelID,
					spamProtection
				}
			} = await db.collection.findOne({ _id: message.guild.id },
				{
					projection: {
						'merchChannel.channelID': 1,
						'merchChannel.spamProtection': 1,
						'merchChannel.blocked': 1
					}
				})

			switch (message.channel.id) {
			case channelID: {
				if (user.bot) return

				const merchChannelID = client.channels.cache.get(channelID)
				spamProtection.forEach(async (msgObj) => {
					try {
						const m = await merchChannelID.messages.fetch(msgObj.messageID)

						// Remove all reactions if there is > 1 or 0. Then add a skull.
						if (Date.now() - m.createdTimestamp >= 3600000 && (m.reactions.cache.size > 1 || m.reactions.cache.size === 0)) {
							await m.reactions.removeAll()
							await removeMessage(message, m, db.collection)
							return await m.react('☠️')
						} else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && m.reactions.cache.has('☠️')) {
							// If there is only a skull, remove users and message from DB
							await removeMessage(message, m, db.collection)
							await m.reactions.removeAll()
							return await m.react('☠️')
						} else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && !m.reactions.cache.has('☠️')) {
							// If there is a single reaction which is not the Skull, then remove that and react with skull. Repeat process over.
							await m.reactions.removeAll()
							await removeMessage(message, m, db.collection)
							return await m.react('☠️')
						} else { return }
					} catch (e) {
						if (e.code === 10008) {
							const messageID = e.path.split('/')[4]
							return await db.collection.updateOne({ _id: message.guild.id }, {
								$pull: {
									'merchChannel.spamProtection': { messageID: messageID }
								}
							})
						} else { return channels.errors.send(e) }
					}
				})
			}
				break
			}
		}
	}
}
