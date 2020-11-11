const cron = require('node-cron');
const { Collection } = require("discord.js");
const { settings } = require('cluster');
const getDb = require("../../mongodb").getDb;

module.exports = async (client, message) => {
	const db = getDb();
	const settingsColl = db.collection("Settings");

	if (message.author.bot) return;
	const filterWords = ["retard", "nigger"]
	const blocked = filterWords.filter(word => {
		return message.content.toLowerCase().includes(word)
	});

	if (message.guild.id === "472448603642920973" && blocked.length > 0) message.delete()

	settingsColl.findOne({ _id: `${message.guild.id}` })
		.then(res => {
			if (!message.content.startsWith(res.prefix)) return;

			const args = message.content.slice(res.prefix.length).split(/ +/g);
			const commandName = args.shift().toLowerCase();

			const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases
				&& cmd.aliases.includes(commandName)); // Command object

			// Admin Roles \\
			const rID = res.roles.adminRole.slice(3, 21) // Get adminRole ID
			const adRole = message.guild.roles.cache.find(role => role.id === rID); // Grab the adminRole object by ID
			const oRoles = message.guild.roles.cache.filter(roles => roles.rawPosition >= adRole.rawPosition); // Grab all roles rawPosition that are equal to or higher than the adminRole
			const filterORoles = oRoles.map(role => role.id); // Finds the ID's of available roles
			const abovePerm = []; // Roles on the member
			const availPerm = []; // adminRole+ that the member doesn't have
			const aboveRP = []; // rawPosition of each role on the member
			filterORoles.forEach(id => {
				if (message.member.roles.cache.has(id)) {
					abovePerm.push(id)
				}
				else {
					availPerm.push(id);
				}
			})
			abovePerm.forEach(id => {
				const abovePermRaw = message.guild.roles.cache.find(role => role.id === id)
				const aboveRp = abovePermRaw.rawPosition + "";
				aboveRp.split().forEach(rp => {
					aboveRP.push(rp);
				})
			})
			const allRoleIDs = availPerm.map(id => `<@&${id}>`);

			// Mod Roles \\
			const mrID = res.roles.modRole.slice(3, 21) // Get modRole ID
			const modRole = message.guild.roles.cache.find(role => role.id === mrID); // Grab the modRole object by ID
			const modRoles = message.guild.roles.cache.filter(roles => roles.rawPosition >= modRole.rawPosition); // Grab all roles' rawPositions that are equal to or higher than the modRole
			const filterORolesM = modRoles.map(role => role.id); // Finds the ID's of available roles
			const abovePermModArray = []; // All roles that the member has that is >= modRole
			const availPermMod = []; // All the roles that the member doesn't have that are >= modRole
			const aboveRPMod = [];
			filterORolesM.forEach(id => {
				if (message.member.roles.cache.has(id)) {
					abovePermModArray.push(id)
				}
				else {
					availPermMod.push(id);
				}
			})
			abovePermModArray.forEach(id => {
				const abovePermRawMod = message.guild.roles.cache.find(role => role.id === id)
				const aboveRpMod = abovePermRawMod.rawPosition + "";
				aboveRpMod.split().forEach(rp => {
					aboveRPMod.push(rp);
				})
			})
			const allModRoleIDs = availPermMod.map(id => `<@&${id}>`);

			let perms = {
				admin: message.member.roles.cache.has(abovePerm[0]) || message.member.roles.cache.has(rID) || message.author.id === message.guild.ownerID,
				mod: message.member.roles.cache.has(abovePermModArray[0]) || message.member.roles.cache.has(mrID) || aboveRPMod[0] >= modRole.rawPosition || message.author.id === message.guild.ownerID,
				joinA: allRoleIDs.join(", "),
				joinM: allModRoleIDs.join(", "),
			}

			try {
				// undefined results in all guilds allowed
				command.guildSpecific === undefined || command.guildSpecific.includes(message.guild.id)
					? command.run(client, message, args, perms)
					: message.channel.send("You cannot use that command in this server.")
			}
			catch (error) {
				if (commandName !== command) message.channel.send("That's not a valid command!");
				console.error(error);
			}
		})

	// DSF - Merch Calls

	/*
	* New DB call to store all messages. Data: author.id, timestamp since last post, timestamp readable, count 
	* Loop through messages, if author.id not found in array, add to array. If found, increase count and change timestamp
	* 2 roles to reach. 
	* Command to see who top 10-25 are (all, scouter, verified scouter + staff roles for activity)
	*/

	await settingsColl.findOne({ _id: message.guild.id })
		.then(async res => {
			if (res.merchChannel === undefined) return
			// if (res.merchChannel === '566338186406789123') return // Remove after
			if (message.channel.id === await res.merchChannel.channelID) {
				message.content.match(/(^(?:m|merch|merchant|w|world)+(\s?)(\d{1,3}))/i)
					? message.channel.send(`<@&670842187461820436>`).then(async m => await m.delete())
					: message.delete()
				cron.schedule('*/30 * * * * *', async () => {
					try {
						let mes = await message.channel.messages.fetch({ limit: 10 })
						mes = mes.filter(m => {
							if (m.reactions.cache.has('☠️')) return
							else return mes
						})
						const log = [...mes.values()]
						for (const messages in log) {
							await settingsColl.findOneAndUpdate({ _id: message.guild.id },
								{
									$addToSet: {
										"merchChannel.messages": {
											$each: [{
												messageID: log[messages].id,
												content: log[messages].content,
												time: log[messages].createdTimestamp,
												author: log[messages].author.username,
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
									if (messageArray[0] === undefined) return;
									if (messageArray[0].author === "Valence Bot") {
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { messageID: messageArray[0].messageID } } })
									}
								})


						}
						const count = await settingsColl.findOne({ _id: message.guild.id }).then(async res => {
							return res.merchChannel.messages.length
						})
						for (let i = 0; i <= count; i++) {
							await settingsColl.findOne({ _id: message.guild.id }).then(async res => {
								const doc = res.merchChannel.messages[i]
								if (doc === undefined) return
								const lastID = doc.messageID
								const lastTime = doc.time

								try {
									const fetched = await message.channel.messages.fetch(lastID)
									const check = Date.now() - lastTime > 60000
									if (check) {
										fetched.react('☠️')
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { messageID: lastID } } })
									}
								} catch (err) {
									if (err.code === 10008) {
										const messageID = err.path.split('/')
										console.log("Error: Uknown Message - Deleted. Removing from DataBase...")
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { 'messageID': messageID[4] } } })
									}
								}

							})
						}
					} catch (err) {
						console.log(err)
					}
				})
				let mes = await message.channel.messages.fetch({ limit: 1 })
				const log = [...mes.values()]
				const msg = log.map(val => val)

				if (res.merchChannel.scoutTracker === undefined) return
				const findMessage = await res.merchChannel.scoutTracker.find(x => x.userID === msg[0].author.id)
				if (!findMessage) {
					await settingsColl.findOneAndUpdate({ _id: message.guild.id },
						{
							$addToSet: {
								'merchChannel.scoutTracker': {
									$each: [{
										userID: msg[0].author.id,
										author: msg[0].author.username,
										firstTimestamp: new Date(msg[0].createdTimestamp),
										lastTimestamp: msg[0].createdTimestamp,
										lastTimestampReadable: new Date(msg[0].createdTimestamp),
										count: 1,
									}]
								}
							}
						})
				} else {
					await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
						$inc: {
							'merchChannel.scoutTracker.$.count': 1,
						},
						$set: {
							'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
							'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
						}
					})
				}
				/* Testing for adding roles - won't work with dsf self assign system
				* Cron job every hour to check if there are any people who meet the criteria of either role - Check this with 1 minute to see if it continuously posts about the same user
				* Send to admin channel as a nice embed to let admins know
				* Create a command as outlined above.

				const scouterRole = message.guild.roles.cache.find(r => r.name === 'Scouter')
				const scouterRoleV = message.guild.roles.cache.find(r => r.name === 'Verified Scouter')
				const addRole = (count, role) => {
					count.forEach(dbs => {
						message.guild.members.fetch(dbs.userID).then(m => {
							if (m.roles.cache.has(role.id)) return
							return m.roles.add(role.id)
						})
					})
				}
				await settingsColl.findOne({ _id: message.guild.id })
					.then(async r => {
						const week = 1000 * 60;
						const month = 1000 * 60 * 60 * 24 * 31;
						const counterScout = await r.merchChannel.scoutTracker.filter(val => val.count >= 10 && val.lastTimestamp - val.firstTimestamp >= week)
						const counterScoutV = await r.merchChannel.scoutTracker.filter(val => val.count >= 25 && val.lastTimestamp - val.firstTimestamp >= month)
						addRole(counterScout, scouterRole)
						addRole(counterScoutV, scouterRoleV)
					})
					*/
			}
		})
		.catch(err => {
			if (err) console.log(err)
		})
}