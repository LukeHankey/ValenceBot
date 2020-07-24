const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "reminders",
	description: ["Shows a list of all reminders.", "Add a new server reminder to a channel. Date format must be Day HH MM.", "Removes a reminder from the server by ID"],
	aliases: ["rem"],
	usage:  ["", "add <date> <channel> <message>", "remove <id>"],
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
		const code = "```";

        
        const db = getDb();
        const settings = db.collection(`Settings`)
        await settings.findOne({ _id: message.guild.name })
		.then(res => {
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

			let messageContent = args.slice(5).join("")
			const dayCheck = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
			let permMod = message.member.roles.cache.has(abovePermModArray[0]) || message.member.roles.cache.has(mrID) || aboveRPMod[0] >= modRole.rawPosition || message.author.id === message.guild.ownerID;
            switch (args[0]) {
                case "add":
					if (!args[1]) {
						settings.findOne({ _id: `${message.guild.name}` })
						.then(r => {
							message.channel.send(`What reminder do you want to add? Examples:\n${code}diff\n+ ${r.prefix}reminders add Monday 15 30 #reminders @citadel The citadel has reset!\n+ ${r.prefix}reminders add 3 01 00 The weekly reset has happened!\n\nNOTE:\n- "${r.prefix}help reminders" for more info on how to add a reminder to a channel.\n- If using number values for the days of the week; Sunday = 0, Monday = 1, Tuesday = 2, etc..${code}`)
						})
					}
                    if (permMod) {
// 						if (res.reminders.length == 0) {
							if ((checkDate(args[1], 0, 6) || dayCheck.includes(args[1])) && checkDate(args[2], 1, 23) && checkDate(args[3], 1, 59)) {
								if (checkNum(args[4], 1, Infinity) && message.guild.channels.cache.has(args[4]) && message.guild.id !== args[4]) {
									if (messageContent) {
										settings.updateOne({ _id: message.guild.name }, {
											$push: { "reminders": { $each: [{ id: message.id, day: args[1], hour: args[2], minute: args[3], channel: args[4], message: messageContent }] }
											}}, { returnOriginal: true })
										.then(r => {
											message.channel.send(`A reminder has been added to <#${args[4]}>:\n ${messageContent}`)
											client.channels.cache.get("731997087721586698")
											.send(`<@${message.author.id}> added a Reminder in server: **${message.guild.name}** - <#${args[4]}>\n${code}diff\n+ ${dayCheck[args[1]] || args[1]} ${doubleDigits(args[2])}:${doubleDigits(args[3])} - ${messageContent}${code}`);
										})
									}
									else {
										message.channel.send(`You must provide a message to send as a reminder to <#${args[4] || channelTag[0]}>.`)
									}
								}
								else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) {
									if (messageContent) {
										settings.findOneAndUpdate({ _id: message.guild.name }, {
											$push: { "reminders": { $each: [{ id: message.id, day: args[1], hour: args[2], minute: args[3], channel: channelTag[0], message: messageContent }] }
											}}, { returnOriginal: false })
										.then(r => {
											message.channel.send(`A reminder has been added to <#${channelTag[0]}>:\n ${messageContent}`)
											client.channels.cache.get("731997087721586698")
											.send(`<@${message.author.id}> added a Reminder in server: **${message.guild.name}** - <#${channelTag[0]}>\n${code}diff\n+ ${dayCheck[r.value.reminders[res.reminders.length].day] || r.value.reminders[res.reminders.length].day} ${doubleDigits(args[2])}:${doubleDigits(args[3])} - ${r.value.reminders[res.reminders.length].message}${code}`);
										})
									}
								}
								else {
									message.channel.send(`What do you want to set the Notificaiton Channel to? Acceptable values:`);
									message.channel.send(`${code}diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)${code}`);
								}
							// else if () {
							// Can add in reminders to be every so many hours if need be
							// }
// 							}
						}
// 						else {
// 							message.channel.send(`You can only set one reminder per server!`)
// 							client.channels.cache.get("731997087721586698")
// 							.send(`<@${message.author.id}> tried to add another Reminder in **${message.guild.name}** - <#${args[4] || channelTag[0]}>\n${code}diff\n+ ${dayCheck[args[1]] || args[1]} ${doubleDigits(args[2])}:${doubleDigits(args[3])} - ${messageContent}${code}`);
// 						}
					}
                    else {
						const allRoleIDs = availPermMod.map(id => `<@&${id}>`);
						const join = allRoleIDs.join(", ")
						message.channel.send(nEmbed("Permission Denied", "You do not have permission to add a Reminder!", colors.red_dark)
						.addField("Only the following Roles & Users can:", join, true)
						.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
                    }
				break;
				case "remove":
					if (permMod) {
						let idCheck = [];
						res.reminders.forEach(x => { x.id })
						if (checkNum(args[1], 1, Infinity) && idCheck.includes(args[1])) {
							let idMap = [];
							settings.find({ "reminders.id": args[1] }).map(ids => { idMap.push(ids.id, ids.channel, ids.message) })
							message.channel.send(`Reminder \`${args[1]}\` has been deleted from <#${idMap[1]}>!\n${code}${args[1]}. ${idMap[2]}${code}`);
							client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> removed a Reminder: ${code}#${args[1]}. ${idMap[2]}${code}`);
							settings.updateOne({ _id: message.guild.name }, { $pull: { reminders: { id: args[1] } } })
							console.log(idMap)
						}						
						console.log(idCheck)
						else {
							message.channel.send(`There is no reminder with that ID. Use ${res.prefix}reminders to show the full list.`)
						}
					}
					else {
						const allRoleIDs = availPermMod.map(id => `<@&${id}>`);
						const join = allRoleIDs.join(", ")
						message.channel.send(nEmbed("Permission Denied", "You do not have permission to remove a Reminder!", colors.red_dark)
						.addField("Only the following Roles & Users can:", join, true)
						.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
					}
				break;
				case "edit":
					if (permMod) {
						
					}
			default:
				if (!args[0]) {
					const list = [];
					console.log(list)
					res.reminders.forEach(x => {
						list.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel}>, Date: \`${dayCheck[x.day] || x.day} ${doubleDigits(x.hour)}:${doubleDigits(x.minute)}\`, Message: \`${x.message}\`\n`)
					})
					message.channel.send(`Your reminders:\n\n${list.join("")}`);
					console.log(list)
				}
			}
		})
	},
}
