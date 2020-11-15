const cron = require('node-cron');
const getDb = require("../../mongodb").getDb;
const { Permissions } = require('../../classes.js')

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

			let aR = new Permissions('adminRole', res, message)
			let mR = new Permissions('modRole', res, message)

			let perms = {
				admin: message.member.roles.cache.has(aR.memberRole()[0]) || message.member.roles.cache.has(aR.roleID()) || message.author.id === message.guild.ownerID,
				mod: message.member.roles.cache.has(mR.memberRole()[0]) || message.member.roles.cache.has(mR.roleID()) || mR.modPlusRoles() >= mR._role.rawPosition || message.author.id === message.guild.ownerID,
				joinA: aR.higherRoles().join(", "),
				joinM: mR.higherRoles().join(", "),
			}
			try {
				// undefined results in all guilds allowed
				command.guildSpecific === undefined || command.guildSpecific.includes(message.guild.id)
					? command.run(client, message, args, perms)
					: message.channel.send("You cannot use that command in this server.")
			}
			catch (error) {
				if (commandName !== command) return
				console.error(error);
			}
		})

	// DSF - Merch Calls

	/*
	* 2 roles to reach. 
	* Command to see who top 10-25 are (all, scouter, verified scouter + staff roles for activity)
	*/
	settingsColl.findOne({ _id: message.guild.id, merchChannel: { $exists: true } })
		.then(async res => {
			if (res === null) return // null if merchChannel property doesn't exist
			// if (res._id === '420803245758480405') return // Remove after
			const merchID = await res.merchChannel.channelID
			if (message.channel.id === merchID) {
				try {
					message.content.match(/(^(?:m|merch|merchant|w|world)+(\s?)(\d{1,3}))/i)
						? message.channel.send(`<@&670842187461820436>`).then(m => m.delete())
						: message.delete()

					const addToDB = cron.schedule('*/10 * * * * *', async () => {
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
												author: log[messages].member.nickname ?? log[messages].author.username,
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
						const count = await settingsColl.findOne({ _id: message.guild.id }).then(res => {
							return res.merchChannel.messages.length
						})
						await settingsColl.findOne({ _id: message.guild.id }).then(async data => {
							for (let i = 0; i < count; i++) {
								const doc = await data.merchChannel.messages[i]
								const lastID = doc.messageID
								const lastTime = doc.time

								try {
									const fetched = await message.channel.messages.fetch(lastID)
									const check = Date.now() - lastTime > 600000
									if (check) {
										fetched.react('☠️')
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { messageID: lastID } } })
									}
								} catch (err) { // Fetching error if the bot restarts
									if (err.code === 10008) {
										const messageID = err.path.split('/')
										console.log("Error: Uknown Message - Deleted. Removing from DataBase...")
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { 'messageID': messageID[4] } } })
									}
								}
							}

						})
					})
				} catch (err) {
					console.log(err)
				}
			}
		})

	/*
	* 2 roles to reach. 
	* Command to see who top 10-25 are (all, scouter, verified scouter + staff roles for activity)
	* ;dsf user [all, userID, mention(?)] > All to show top 25, maybe paginate
	* ;dsf role [scouter, verified scouter, staff (all staff)]
	* ;profile (returns self)
	* ;profile [all, userID, mention] || [scouter, verified scouter, staff]
	*/

	// Run every 24 hours and filter the database for:
	// - All entries where count && timestamps > valueForScouterRole && !assigned field ✅
	// - If count > requiredAmount, create an embed, loop through the DB for the values to push to an array and add as fields to embed ✅
	// - Send embed to admin channel for manual role addition. ✅
	// - Think about if we dont want to give someone a role? > Stay on list and repeat or somehow remove (new field, either check if exists or assign boolean)
	// - From the filtered lot posted in the embed, check every 6 hours if they have the role assigned to them. If so, remove them from the list and insert a field: assigned: roleID/name ✅

	// - If 0 entries that pass the filter, return. ✅

	/**
	 * Set this in classes.js ✅
	 * Add into ready.js ✅
	 * Cron job it for every week to post updated values ✅
	 * Also use in a command where the values can be changed
	 */
}