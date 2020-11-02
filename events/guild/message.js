const cron = require('node-cron');
const { Collection } = require("discord.js");
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
	const channelName = message.guild.channels.cache.find(c => c.name === "merch-calls")

	if (message.channel.id === channelName.id) {
		message.content.match(/(?:(?:^|m|merch|merchant|w|world)(?:\s)*)(\d{1,3})(?:[^\d]|$)/i)
			? message.channel.send(`<@&670842187461820436>`).then(m => m.delete())
			: message.delete()
		cron.schedule('*/30 * * * * *', async () => {
			try {
				let mes = await message.channel.messages.fetch({ limit: 10 })
				mes = mes.filter(m => {
					if (m.reactions.cache.has('☠️')) {
						return
					} else return mes
				})
				const log = [...mes.values()]
				for (const messages in log)
					settingsColl.findOneAndUpdate({ _id: message.guild.id },
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
						{ sort: { time: 1 } }
					)
				const count = await settingsColl.findOne({ _id: message.guild.id }).then(async res => {
					return res.merchChannel.messages.length
				})
				for (let i = 0; i <= count; i++) {
					settingsColl.findOne({ _id: message.guild.id }).then(async res => {
						const doc = res.merchChannel.messages[i]
						if (doc === undefined) return
						const lastID = doc.messageID
						const lastTime = doc.time

						const fetched = await message.channel.messages.fetch(lastID)
						try {
							const check = Date.now() - lastTime > 600000
							if (check) {
								fetched.react('☠️')
								await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { "merchChannel.messages": { messageID: lastID } } })
							}
						} catch (err) {
							if (err.code === 10008) {
								return console.log("Error: Uknown Message - Deleted")
							}
						}

					})
				}
			} catch (err) {
				console.log(err)
			}
		})
	}
}