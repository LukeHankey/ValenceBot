const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "reminders",
	description: ["Shows a list of all reminders.", "Add a new reminder to a channel. Date format must be Day HH MM.", "Adds a citadel reminder to a channel to let your clan members know a reset has happened. The citadel reset time must be set and turned on.", "Removes a reminder from the server by ID"],
	aliases: ["rem"],
	usage:  ["", "add <date> <channel> <message>", "Add citadel <channel> <message>", "remove <id>"],
	run: async (client, message, args) => {
        function checkNum(id = 0, gr_eq = 1, l_eq = Infinity) {
			if (+id !== parseInt(id) || !(id >= gr_eq) || !(id <= l_eq)) {
				return false
			} else {
				return true
			}
        }
        function checkDate(id = 0, gr_eq = 0, l_eq = Infinity) {
			if (+id !== parseInt(id) || !(id >= gr_eq) || !(id <= l_eq)) {
				return false
			} else {
				return true
			}
		}
		function doubleDigits(digit) {
			if (digit.length === 2) {
				return digit;
			}
			else {
				const zero = "0";
				return zero.concat(digit)
			}
		}
		function capitalise(str) {
			return str.charAt(0).toUpperCase() + str.slice(1);
		}
		const code = "```";

        const db = getDb();
		const settings = db.collection(`Settings`)
		
        await settings.findOne({ _id: message.guild.name })
		.then(async res => {
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
			const channelTag = [];
			if (args[4] === undefined) {
				channelTag.push("false")
			}
			else {
				channelTag.push(args[4].slice(2, 20))
			}
			
			const allRoleIDs = availPermMod.map(id => `<@&${id}>`);
			const join = allRoleIDs.join(", ")

			let messageContent = args.slice(5).join(" ")
			const dayCheck = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
			let permMod = message.member.roles.cache.has(abovePermModArray[0]) || message.member.roles.cache.has(mrID) || aboveRPMod[0] >= modRole.rawPosition || message.author.id === message.guild.ownerID;
		   
			switch (args[0]) {
                case "add":
				if (permMod) {
// 						if (res.reminders.length == 0) {
					if ((checkDate(args[1], 0, 6) || dayCheck.includes(capitalise(args[1].toLowerCase()))) && checkDate(args[2], 0, 23) && checkDate(args[3], 0, 59)) {
						if (checkNum(args[4], 1, Infinity) && message.guild.channels.cache.has(args[4]) && message.guild.id !== args[4]) {
							if (messageContent) {
								settings.updateOne({ _id: message.guild.name }, {
									$push: { "reminders": { $each: [{ id: message.id, day: capitalise(args[1].toLowerCase()), hour: args[2], minute: args[3], channel: args[4], message: messageContent }] }
									}}, { returnOriginal: true })
									message.channel.send(`A reminder has been added to <#${args[4]}>`)
									client.channels.cache.get("731997087721586698")
									.send(`<@${message.author.id}> added a Reminder in server: **${message.guild.name}** - <#${args[4]}>\n${code}diff\n+ ${dayCheck[capitalise(args[1].toLowerCase())] || args[1]} ${doubleDigits(args[2])}:${doubleDigits(args[3])} - ${messageContent}${code}`);
							}
							else {
								message.channel.send(`You must provide a message to send as a reminder to <#${args[4] || channelTag[0]}>.`)
							}
						}
						else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) {
							if (messageContent) {
								settings.findOneAndUpdate({ _id: message.guild.name }, {
									$push: { "reminders": { $each: [{ id: message.id, day: capitalise(args[1].toLowerCase()), hour: args[2], minute: args[3], channel: channelTag[0], message: messageContent }] }
									}}, { returnOriginal: false })
								.then(r => {
									message.channel.send(`A reminder has been added to <#${channelTag[0]}>`)
									client.channels.cache.get("731997087721586698")
									.send(`<@${message.author.id}> added a Reminder in server: **${message.guild.name}** - <#${channelTag[0]}>\n${code}diff\n+ ${dayCheck[capitalise(args[1].toLowerCase())] || args[1]} ${doubleDigits(args[2])}:${doubleDigits(args[3])} - ${messageContent}${code}`);
								})
							}
							else {
								message.channel.send(`You must provide a message to send as a reminder to <#${channelTag[0]}>.`)
							}
						}
						else { // ;rem add sends this instead of the next message
							message.channel.send(`What do you want to set the Notificaiton Channel to? Acceptable values:`);
							message.channel.send(`${code}diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)${code}`);
						}
							// else if () {
							// Can add in reminders to be every so many hours if need be
							// }
// 							}
					}
					else {
						message.channel.send(`What reminder do you want to add? Examples:\n${code}diff\n+ ${res.prefix}reminders add Monday 15 30 #reminders We have completed the challenge!\n+ ${res.prefix}reminders add 3 01 00 The weekly reset has happened!\n\nNOTE:\n- "${res.prefix}help reminders" for more info on how to add a reminder to a channel.\n- If using number values for the days of the week; Sunday = 0, Monday = 1, Tuesday = 2, etc..${code}`)
					}
// 						else {
// 							message.channel.send(`You can only set one reminder per server!`)
// 							client.channels.cache.get("731997087721586698")
// 							.send(`<@${message.author.id}> tried to add another Reminder in **${message.guild.name}** - <#${args[4] || channelTag[0]}>\n${code}diff\n+ ${dayCheck[args[1]] || args[1]} ${doubleDigits(args[2])}:${doubleDigits(args[3])} - ${messageContent}${code}`);
// 						}
					}
                    else {
						message.channel.send(nEmbed("Permission Denied", "You do not have permission to add a Reminder!", colors.red_dark)
						.addField("Only the following Roles & Users can:", join, true)
						.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
                    }
				break;
				case "remove":
					if (permMod) {
						let idCheck = [];
						res.reminders.forEach(x => { idCheck.push(x.id) })
						if (checkNum(args[1], 1, Infinity) && idCheck.includes(args[1])) {
							message.channel.send(`Reminder \`${args[1]}\` has been deleted.`);
							client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> removed a Reminder: \`${args[1]}\``);
							settings.updateOne({ _id: message.guild.name }, { $pull: { reminders: { id: args[1] } } })
						}
						else if (!args[1]) {
							message.channel.send(`You must provide an ID to remove.`);
						}
						else {
							message.channel.send(`There is no reminder with that ID. Use ${res.prefix}reminders to show the full list.`)
						}
					}
					else {
						message.channel.send(nEmbed("Permission Denied", "You do not have permission to remove a Reminder!", colors.red_dark)
						.addField("Only the following Roles & Users can:", join, true)
						.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
					}
				break;
				case "edit":
					if (permMod) {
						let editMessage = args.slice(3).join(" ");
						let param = args.slice(2, 3).join("").toLowerCase()
						let idCheck = [];
						res.reminders.forEach(x => { idCheck.push(x.id) })
						if (checkNum(args[1], 1, Infinity) && idCheck.includes(args[1]) && param === "channel") { 
							settings.findOneAndUpdate({ _id: message.guild.name, "reminders.id": args[1] }, { $set: { "reminders.$.channel": args[3] } } )
							if (args[3].length > 18) {
								message.channel.send(`Reminder \`${args[1]}\` has had the channel changed to <#${args[3].slice(2, 20)}>`);
							}
							else if (!args[3]) {
								message.channel.send(`You need to specify a channel to change to. Either the channel ID or the channel Tag.`);	
							 }
							else {
								message.channel.send(`Reminder \`${args[1]}\` has had the channel changed to <#${args[3]}>`);
							}                                    
							client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Reminder: \`${args[1]}\``);
						}
						else if (checkNum(args[1], 1, Infinity) && idCheck.includes(args[1]) && param === "message") {
							settings.findOneAndUpdate({ _id: message.guild.name, "reminders.id": args[1] }, { $set: { "reminders.$.message": editMessage } } )
							if (!editMessage) {
								message.channel.send(`You need to specify the message content you'd like to change.`);
							}
							message.channel.send(`Reminder \`${args[1]}\` has had the message changed to \`${editMessage}\``);
							client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Reminder: \`${args[1]}\``);
						}
						else if (checkNum(args[1], 1, Infinity) && idCheck.includes(args[1])) {
							if (param === "date" || param === "time") {
								if (checkDate(args[3], 0, 6) && checkDate(args[4], 0, 23) && checkDate(args[5], 0, 59)) {
									settings.findOneAndUpdate({ _id: message.guild.name, "reminders.id": args[1] }, { $set: { "reminders.$.day": args[3], "reminders.$.hour": args[4], "reminders.$.minute": args[5] } } )
									if (!args[3] && !args[4] && !args[5]) {
										message.channel.send(`You must provide the full Datetime to change. Example: \`Monday 14 25\``);
									}
									message.channel.send(`Reminder \`${args[1]}\` has had the date/time changed to \`${dayCheck[capitalise(args[3].toLowerCase())] || args[3]} ${doubleDigits(args[4])}:${doubleDigits(args[5])}\``);
									client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Reminder: \`${args[1]}\``);
								}
							}
						}
						else if (!args[1]) {
							message.channel.send(`You must provide an ID to remove.`);
						}
						else if (args[1] && !args[2]) {
							message.channel.send(`You must provide a parameter to edit. You can edit either the \`Channel\`, \`Date / Time\` or the \`Message\`.`);
						}
						else {
							message.channel.send(`There is no reminder with that ID. Use \`${res.prefix}citadel reminders\` to show the full list.`)
						}
					}
					else {
						message.channel.send(nEmbed("Permission Denied", "You do not have permission to remove a Reminder!", colors.red_dark)
						.addField("Only the following Roles & Users can:", join, true)
						.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
					}
				break;
			default:
				if (!args[0]) {
					if (res.reminders.length === 0) {
						message.channel.send(`You have no server reminders set.`)
					}
					else {
						const list = [];
						res.reminders.forEach(x => {
							if (x.channel.length > 18) {
								list.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel.slice(2, 20)}>, Date: \`${dayCheck[x.day] || x.day} ${doubleDigits(x.hour)}:${doubleDigits(x.minute)}\`, Message: ${x.message}\n`)
							}
							else {
								list.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel}>, Date: \`${dayCheck[x.day] || x.day} ${doubleDigits(x.hour)}:${doubleDigits(x.minute)}\`, Message: ${x.message}\n`)
							}
						})
						message.channel.send(`Your reminders:\n\n${list.join("")}`);
					}
				}
			}
		})
	},
}
