const getDb = require("../../mongodb").getDb;
const func = require("../../functions.js")
const colors = require('../../colors.json')

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 472448603642920973 - Valence
 */

module.exports = {
	name: "reminders",
	description: ["Shows a list of all reminders.", "Add a new reminder to a channel. Date format must be Day HH MM.", "Removes a reminder from the server by ID", "Edit a server reminder."],
	aliases: ["rem"],
	usage:  ["", "add <date> <channel> <message>", "remove <id>", "edit <id> <param> <new value>"],
	guildSpecific: ["472448603642920973", "733164313744769024", "668330890790699079"],
	run: async (client, message, args, perms) => {
		const code = "```";

        const db = getDb();
		const settings = db.collection(`Settings`)
		
        await settings.findOne({ _id: message.guild.id})
		.then(async res => {
			const channelTag = [];
			if (args[4] === undefined) {
				channelTag.push("false")
			}
			else {
				channelTag.push(args[4].slice(2, 20))
			}

			let messageContent = args.slice(5).join(" ")
			const dayCheck = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
			
			switch (args[0]) {
                case "add":
				if (perms.mod) {
// 						if (res.reminders.length == 0) {
					if (args[1] && args[2] && args[3]) {
						if ((func.checkDate(args[1], 0, 6) || dayCheck.includes(func.capitalise(args[1].toLowerCase()))) && func.checkDate(args[2], 0, 23) && func.checkDate(args[3], 0, 59)) {
							if (func.checkNum(args[4], 1, Infinity) && message.guild.channels.cache.has(args[4]) && message.guild.id !== args[4]) {
								if (messageContent) {
									settings.updateOne({ _id: message.guild.id}, {
										$push: { "reminders": { $each: [{ id: message.id, day: func.capitalise(args[1].toLowerCase()), hour: args[2], minute: args[3], channel: args[4], message: messageContent }] }
										}}, { returnOriginal: true })
										message.channel.send(`A reminder has been added to <#${args[4]}>`)
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> added a Reminder in server: **${message.guild.name}** - <#${args[4]}>\n${code}diff\n+ ${dayCheck[func.capitalise(args[1].toLowerCase())] || args[1]} ${func.doubleDigits(args[2])}:${func.doubleDigits(args[3])} - ${messageContent}${code}`);
								}
								else {
									message.channel.send(`You must provide a message to send as a reminder to <#${args[4] || channelTag[0]}>.`)
								}
							}
							else if (func.checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) {
								if (messageContent) {
									settings.findOneAndUpdate({ _id: message.guild.id}, {
										$push: { "reminders": { $each: [{ id: message.id, day: func.capitalise(args[1].toLowerCase()), hour: args[2], minute: args[3], channel: channelTag[0], message: messageContent }] }
										}}, { returnOriginal: false })
									.then(r => {
										message.channel.send(`A reminder has been added to <#${channelTag[0]}>`)
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> added a Reminder in server: **${message.guild.name}** - <#${channelTag[0]}>\n${code}diff\n+ ${dayCheck[func.capitalise(args[1].toLowerCase())] || args[1]} ${func.doubleDigits(args[2])}:${func.doubleDigits(args[3])} - ${messageContent}${code}`);
									})
								}
								else {
									message.channel.send(`You must provide a message to send as a reminder to <#${channelTag[0]}>.`)
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
					}
					else {
						message.channel.send(`What reminder do you want to add? Examples:\n${code}diff\n+ ${res.prefix}reminders add Monday 15 30 #reminders We have completed the challenge!\n+ ${res.prefix}reminders add 3 01 00 The weekly reset has happened!\n\nNOTE:\n- "${res.prefix}help reminders" for more info on how to add a reminder to a channel.\n- If using number values for the days of the week; Sunday = 0, Monday = 1, Tuesday = 2, etc..${code}`)
					}
// 						else {
// 							message.channel.send(`You can only set one reminder per server!`)
// 							client.channels.cache.get("731997087721586698")
// 							.send(`<@${message.author.id}> tried to add another Reminder in **${message.guild.name}** - <#${args[4] || channelTag[0]}>\n${code}diff\n+ ${dayCheck[args[1]] || args[1]} ${func.doubleDigits(args[2])}:${func.doubleDigits(args[3])} - ${messageContent}${code}`);
// 						}
					}
                    else {
						message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to add a Reminder!", colors.red_dark)
						.addField("Only the following Roles & Users can:", perms.joinM, true)
						.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
                    }
				break;
				case "remove":
					if (perms.mod) {
						let idCheck = [];
						res.reminders.forEach(x => { idCheck.push(x.id) })
						if (func.checkNum(args[1], 1, Infinity) && idCheck.includes(args[1])) {
							message.channel.send(`Reminder \`${args[1]}\` has been deleted.`);
							client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> removed a Reminder: \`${args[1]}\``);
							settings.updateOne({ _id: message.guild.id}, { $pull: { reminders: { id: args[1] } } })
						}
						else if (!args[1]) {
							message.channel.send(`You must provide an ID to remove.`);
						}
						else {
							message.channel.send(`There is no reminder with that ID. Use ${res.prefix}reminders to show the full list.`)
						}
					}
					else {
						message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to remove a Reminder!", colors.red_dark)
						.addField("Only the following Roles & Users can:", perms.joinM, true)
						.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
					}
				break;
				case "edit":
					if (perms.mod) {
						let editMessage = args.slice(3).join(" ");
						let param = args.slice(2, 3).join("").toLowerCase()
						let idCheck = [];
						res.reminders.forEach(x => { idCheck.push(x.id) })
						if (func.checkNum(args[1], 1, Infinity) && idCheck.includes(args[1])) { 
							if (param === "channel") {
								if (!args[3]) {
									message.channel.send(`You need to specify a channel to change to. Either the channel ID or the channel Tag.`);	
								}
								else if (args[3].length > 18) {
									settings.findOneAndUpdate({ _id: message.guild.name, "reminders.id": args[1] }, { $set: { "reminders.$.channel": args[3] } } )
									message.channel.send(`Reminder \`${args[1]}\` has had the channel changed to <#${args[3].slice(2, 20)}>`);
									client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Reminder: \`${args[1]}\``);
								}
								else {
									settings.findOneAndUpdate({ _id: message.guild.name, "reminders.id": args[1] }, { $set: { "reminders.$.channel": args[3] } } )
									message.channel.send(`Reminder \`${args[1]}\` has had the channel changed to <#${args[3]}>`);
									client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Reminder: \`${args[1]}\``);}                                    
								}
							else if (param === "message") {
								if (!editMessage) {
									message.channel.send(`You need to specify the message content you'd like to change.`);
								}
								else {
									settings.findOneAndUpdate({ _id: message.guild.name, "reminders.id": args[1] }, { $set: { "reminders.$.message": editMessage } } )
									message.channel.send(`Reminder \`${args[1]}\` has had the message changed to \`${editMessage}\``);
									client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Reminder: \`${args[1]}\``);
								}
							}
							else if (param === "date" || param === "time") {
								if (!args[3] && !args[4] && !args[5]) {
									message.channel.send(`You must provide the full Datetime to change. Example: \`Monday 14 25\``);
								}
								else if (func.checkDate(args[3], 0, 6) && func.checkDate(args[4], 0, 23) && func.checkDate(args[5], 0, 59)) {
									settings.findOneAndUpdate({ _id: message.guild.name, "reminders.id": args[1] }, { $set: { "reminders.$.day": args[3], "reminders.$.hour": args[4], "reminders.$.minute": args[5] } } )
									message.channel.send(`Reminder \`${args[1]}\` has had the date/time changed to \`${dayCheck[func.capitalise(args[3].toLowerCase())] || args[3]} ${func.doubleDigits(args[4])}:${func.doubleDigits(args[5])}\``);
									client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Reminder: \`${args[1]}\``);
								}
							}
							else {
								message.channel.send(`You must provide a parameter to edit. You can edit either the \`Channel\`, \`Date / Time\` or the \`Message\`.`);
							}
						}							
						else if (!args[1]) {
							message.channel.send(`You must provide an ID to remove.`);
						}
						else {
							message.channel.send(`There is no reminder with that ID. Use \`${res.prefix}reminders\` to show the full list.`)
						}
					}
					else {
						message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to remove a Reminder!", colors.red_dark)
						.addField("Only the following Roles & Users can:", perms.joinM, true)
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
								list.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel.slice(2, 20)}>, Date: \`${dayCheck[x.day] || x.day} ${func.doubleDigits(x.hour)}:${func.doubleDigits(x.minute)}\`, Message: ${x.message}\n`)
							}
							else {
								list.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel}>, Date: \`${dayCheck[x.day] || x.day} ${func.doubleDigits(x.hour)}:${func.doubleDigits(x.minute)}\`, Message: ${x.message}\n`)
							}
						})
						message.channel.send(`Your reminders:\n\n${list.join("")}`);
					}
				}
			}
		})
	},
}
