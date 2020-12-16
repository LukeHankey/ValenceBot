const cron = require('node-cron');
const getDb = require("../../mongodb").getDb;
const colors = require('../../colors.json')
const { Permissions } = require('../../classes.js');
const { MessageEmbed } = require('discord.js')

module.exports = async (client, message) => {
	const db = getDb();
	const settingsColl = db.collection("Settings");

	// Handling DMs

	if (message.guild === null) {
		const dm = message.channel
		let dmMessages = await dm.messages.fetch({ limit: 1 })
		const dmPerson = dm.recipient // User object
		const dmMsg = []
		dmMessages = [...dmMessages.values()]

		for (const val in dmMessages) {
			if (dmMessages[val].author.id === '668330399033851924') return
			dmMsg.push(dmMessages[val].content)
		}

		const embed = new MessageEmbed()
			.setTitle(`New DM Recieved`)
			.setDescription(`${dmPerson.tag} sent me a DM.`)
			.setColor(colors.blue_dark)
			.addField(`User ID`, `${dmPerson.id}`, false)
			.addField('Message contents', `${dmMsg.join('\n')}`)
			.setTimestamp()

		return client.channels.cache.get('788525524782940187').send(embed)
		.then(async msg => {
			const mFilter = m => m.content.length > 0
			msg.channel.awaitMessages(mFilter, { max: 1, time: 3600000, errors: ['time'] })
			.then(async m => {
				const u = await client.users.fetch(dmPerson.id)
				return u.send(m.first().content)
			})
			.catch(async col => {
				let lastMessage = await msg.channel.fetch()
				lastMessage = lastMessage.messages.cache.last().content
				if (!lastMessage) return
				const u = await client.users.fetch(dmPerson.id)
				return u.send(lastMessage)
			})
		})
	}

	// Merch Posts Publish

	if (message.channel.id === '770307127557357648') {
		if (message.author.bot) {
			message.crosspost()
		}
	}

	if (message.author.bot) return;

	// Valence - Filter

	const filterWords = ["retard", "nigger"]
	const blocked = filterWords.filter(word => {
		return message.content.toLowerCase().includes(word)
	});

	if (message.guild.id === "472448603642920973" && blocked.length > 0) message.delete()

	// DSF - Merch Calls

	await settingsColl.findOne({ _id: message.guild.id, merchChannel: { $exists: true } })
		.then(async res => {
			if (res === null) return // null if merchChannel property doesn't exist
			// if (res._id === '420803245758480405') return // Remove after
			const merchID = await res.merchChannel.channelID
			const otherID = await res.merchChannel.otherChannelID
			const errorLog = await client.channels.cache.get('784543962174062608').fetchWebhooks()

			if (message.channel.id === merchID) {
				const merchRegex = /(^(?:m|merch|merchant|w|world){1}(\s?)(?!3$|7$|8$|11$|13$|17|19|20|29|33|34|38|41|43|47|57|61|75|80|81|90|93|94|101|102|10[7-9]|11[0-3]|12[0-2]|12[5-9]|13[0-3]|135|136)([1-9]\d?|1[0-3]\d|140)(\s?|\s+\w*)*$)/i
				message.content.match(merchRegex)
					? message.channel.send(`<@&670842187461820436> - ${message.content}`).then(m => m.delete()).catch(async err => {
						const messageID = err.path.split('/')
						const fetched = await message.channel.fetch(messageID[4])
						fetched.delete()
						console.log(`Unable to delete my own message`, err)
					})
					: message.delete()
				try {
					const addToDB = cron.schedule('*/10 * * * * *', async () => { // Adding to the DB
						let mes = await message.channel.messages.fetch({ limit: 10 })
						mes = mes.filter(m => {
							if (m.reactions.cache.has('☠️')) return
							else return mes
						})
						const log = [...mes.values()]
						for (const messages in log) {
							const authorName = log[messages].member?.nickname ?? log[messages].author.username
							await settingsColl.findOneAndUpdate({ _id: message.guild.id },
								{
									$addToSet: {
										"merchChannel.messages": {
											$each: [{
												messageID: log[messages].id,
												content: log[messages].content,
												time: log[messages].createdTimestamp,
												author: authorName,
												userID: log[messages].member?.id ?? log[messages].author.id
											}],
										}
									}
								},
								{
									sort: { time: 1 },
									returnNewDocument: true
								}
							)
								.then(async db => {
									const messageArray = await db.value.merchChannel.messages;
									if (messageArray[0] === undefined) return; // Undefined if bot spams the merch call
									if (messageArray[0].author === "Valence Bot" || messageArray[0].author === null) {
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { messageID: messageArray[0].messageID } } })
									}
								})
						}
						const mesOne = await message.channel.messages.fetch({ limit: 1 })
						const logOne = [...mesOne.values()]
						const msg = logOne.map(val => val)
						const tracker = await res.merchChannel.scoutTracker

						const findMessage = tracker.find(x => x.userID === msg[0].author.id)
						if (!findMessage) {
							await settingsColl.findOneAndUpdate({ _id: message.guild.id },
								{
									$addToSet: {
										'merchChannel.scoutTracker': {
											$each: [{
												userID: msg[0].author.id,
												author: msg[0].member.nickname ?? msg[0].author.username,
												firstTimestamp: msg[0].createdTimestamp,
												firstTimestampReadable: new Date(msg[0].createdTimestamp),
												lastTimestamp: msg[0].createdTimestamp,
												lastTimestampReadable: new Date(msg[0].createdTimestamp),
												count: 1,
												otherCount: 0,
												assigned: [],
											}]
										}
									}
								})
							addToDB.stop()
						} else {
							await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
								$inc: {
									'merchChannel.scoutTracker.$.count': 1,
								},
								$set: {
									'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
									'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
								},
							})
							addToDB.stop()
						}
					})
					cron.schedule('*/20 * * * * *', async () => { // Checking the DB and marking dead calls
					await settingsColl.findOne({ _id: message.guild.id }).then(async data => {
							for await (const doc of data.merchChannel.messages) {
								const lastID = doc.messageID
								const lastTime = doc.time

								try {
									const fetched = await message.channel.messages.fetch(lastID)
									const check = Date.now() - lastTime > 600000

									if (check) {
										fetched.react('☠️')
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { messageID: lastID } } })
									}
								} catch (e) {
									const messageID = e.path.split('/')
									await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { messageID: messageID[4] } } })
								}
								
							}
						})
					})

					await settingsColl.findOne({ _id: message.guild.id }).then(async data => { // Posts only 1 error to the error channel
						const errorEmbed = (document, error) => {
							const embed = new MessageEmbed()
								.setTitle(`Error: Unknown Message`)
								.setDescription(`Message has been deleted. Removing from the DataBase. - **${data.serverName}**`)
								.setColor(colors.red_dark)
								.addField(`Content:`, `${document.content}`, true)
								.addField(`Author: ${document.author}`, `${document.userID}`, true)
								.addField(`Message ID:`, `${document.messageID}`, true)
								.addField(`Stack Trace`, `\`\`\`js\n${error.stack}\`\`\``)
							return embed
						}
						const errorSet = new Set()

						for await (const doc of data.merchChannel.messages) {
							const lastID = doc.messageID

							try {
								await message.channel.messages.fetch(lastID)
							} catch (err) {
								if (err.code === 10008) {
									if (doc.userID === '668330399033851924') return
									errorSet.add({ document: doc, error: err })
								}
							}
						}
						const errValues = errorSet.values()
						const errNext = errValues.next().value

						if (errorSet.size) {
							return errorLog.first().send(`${data.serverName === 'Deep Sea Fishing' ? '<@!212668377586597888>' : ''}`, errorEmbed(errNext.document, errNext.error))
								.then(async x => {
									await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { 'messageID': errNext.document.messageID } } })
									errorSet.delete({ document: errNext.document, error: errNext.error })
									errorSet.clear()
								})
						} else return
					})
				} catch (err) {
					console.log(err)
				}
			} else if (message.channel.id === otherID) {
				const addToDBOther = cron.schedule('*/10 * * * * *', async () => { // Adding to the DB
					try {
						const mesOne = await message.channel.messages.fetch({ limit: 1 })
						const logOne = [...mesOne.values()]
						const msg = logOne.map(val => val)
						const tracker = await res.merchChannel.scoutTracker

						const findMessage = await tracker.find(x => x.userID === msg[0].author.id)
						if (!findMessage) {
							await settingsColl.findOneAndUpdate({ _id: message.guild.id },
								{
									$addToSet: {
										'merchChannel.scoutTracker': {
											$each: [{
												userID: msg[0].author.id,
												author: msg[0].member.nickname ?? msg[0].author.username,
												firstTimestamp: msg[0].createdTimestamp,
												firstTimestampReadable: new Date(msg[0].createdTimestamp),
												lastTimestamp: msg[0].createdTimestamp,
												lastTimestampReadable: new Date(msg[0].createdTimestamp),
												count: 0,
												otherCount: 1,
												assigned: [],
											}]
										}
									}
								})
							addToDBOther.stop()
						} else {
							await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
								$inc: {
									'merchChannel.scoutTracker.$.otherCount': 1,
								},
								$set: {
									'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
									'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
								},
							})
							addToDBOther.stop()
						}
					} catch (e) {
						console.log(e)
					}
				})
			} else return
		})

	// Commands

	settingsColl.findOne({ _id: `${message.guild.id}` })
		.then(res => {
			if (!message.content.startsWith(res.prefix)) return;

			const args = message.content.slice(res.prefix.length).split(/ +/g);
			const commandName = args.shift().toLowerCase();

			const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases
				&& cmd.aliases.includes(commandName)); // Command object

			let aR = new Permissions('adminRole', res, message)
			let mR = new Permissions('modRole', res, message)
			let owner = new Permissions('owner', res, message)

			let perms = {
				owner: owner.botOwner(),
				admin: message.member.roles.cache.has(aR.memberRole()[0]) || message.member.roles.cache.has(aR.roleID) || message.author.id === message.guild.ownerID,
				mod: message.member.roles.cache.has(mR.memberRole()[0]) || message.member.roles.cache.has(mR.roleID) || mR.modPlusRoles() >= mR._role.rawPosition || message.author.id === message.guild.ownerID,
				errorO: owner.ownerError(),
				errorM: mR.error(),
				errorA: aR.error(),
			}
			try {
				command.guildSpecific === 'all' || command.guildSpecific.includes(message.guild.id)
					? command.run(client, message, args, perms)
					: message.channel.send("You cannot use that command in this server.")
			}
			catch (error) {
				if (commandName !== command) return
				console.error(error);
			}
		})
	// Update DB
	// try {
	// 	await settingsColl.find({ _id: message.guild.id }).forEach(async doc => { // Updates all by removing a field
	// 	let arr = doc.merchChannel.scoutTracker;
	// 	let length = arr.length;
	// 	for (let i = 0; i < length; i++) {
	// 		delete arr[i]["assigned"];
	// 	}
	// 	// await settingsColl.save(doc);
	// 	await settingsColl.update({ _id: message.guild.id }, { // Updates all by adding a field
	// 		$set: {
	// 			'merchChannel.scoutTracker.$[].otherCount': 0,
	// 		},
	// 	})
	// })

	// Finds a profile and adds to it
	// await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.author': 'Attaining'}, {
	// 	$inc: {
	// 		'merchChannel.scoutTracker.$.otherCount': 85,
	// 	},
	// })

	// } catch (err) {
	// 	console.log(err)
	// }
}