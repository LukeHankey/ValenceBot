const colors = require("../../colors.json");
const Discord = require("discord.js");
const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "citadel",
	description: ["Lists out the citadel commands.", "Toggles the citadel reset time & reminders on/off.", "Shows the current Citadel Reset Time.", "Allows a user to suggest the reset time - Sends info to the current Admin Channel.", "Sets the new Citadel Reset Time.", "Lists the current citadel reminders by ID.", "Adds a new citadel reminder.", "Removes a citadel reminder.", "Edit an existing citadel reminder by ID, then the field you want to change; then the updated value."],
	aliases: ["c", "cit"],
	usage:  ["", "on/off", "reset", "reset info", "reset set", "reminders", "reminders add <date/time> <channel> <message>", "reminders remove <id>", "reminders edit <id> <parameter> <new value>"],
	run: async (client, message, args) => {
        const nEmbed = function(title, description, color = colors.cyan, thumbnail = "") {
			const embed = new Discord.MessageEmbed()
				.setTitle(title)
				.setDescription(description)
				.setColor(color)
				.setThumbnail(thumbnail)
                .setTimestamp()
			return embed;
        }; // Discord Embed
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
		.then(async res => {
        // Admin Roles //
        const rID = res.roles.adminRole.slice(3, 21) // Get adminRole ID
        const adRole = message.guild.roles.cache.find(role => role.id === rID); // Grab the adminRole object by ID
        const oRoles = message.guild.roles.cache.filter(roles => roles.rawPosition >= adRole.rawPosition); // Grab all roles rawPosition that are equal to or higher than the adminRole
        const filterORoles = oRoles.map(role => role.id); // Finds the ID's of available roles
        const abovePerm = []; // Roles on the member
        const availPerm = []; // adminRole+ that the member doesn't have
        const idFilter = []; // Roles not on the member
        const aboveRP = []; // rawPosition of each role on the member
        let permAdmin = message.member.roles.cache.has(abovePerm[0]) || message.member.roles.cache.has(rID) || message.author.id === message.guild.ownerID; // Admin Permissions
        const allRoleIDs = availPerm.map(id => `<@&${id}>`);
        const join = allRoleIDs.join(", ")
        filterORoles.forEach(id => {
            if (message.member.roles.cache.has(id)) {
                abovePerm.push(id)
            }
            else {
                availPerm.push(id);
            }
        })
        filterORoles.filter(id => {
            if (!abovePerm.includes(id)) {
                idFilter.push(id) 
            }
        })
        abovePerm.forEach(id => {
            const abovePermRaw = message.guild.roles.cache.find(role => role.id === id)
            const aboveRp = abovePermRaw.rawPosition + "";
            aboveRp.split().forEach(rp => {
                aboveRP.push(rp);
            })
        })

        // Mod Roles //
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
        const channelTagCit = [];
        if (args[2] === undefined) {
            channelTagCit.push("false")
        }
        else {
            channelTagCit.push(args[2].slice(2, 20))
        }

		let messageContentCit = args.slice(3).join(" ")
        const dayCheck = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        let permMod = message.member.roles.cache.has(abovePermModArray[0]) || message.member.roles.cache.has(mrID) || aboveRPMod[0] >= modRole.rawPosition || message.author.id === message.guild.ownerID;

        switch (args[0]) {
            case "reminders":
                switch (args[1]) {
                    case "add":
                        if (permMod) {
                            if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2])) {
                                if (messageContentCit) {
                                    settings.updateOne({ _id: message.guild.name }, {
                                        $push: { "citadel_reset_time.reminders": { $each: [{ id: message.id, channel: args[2], message: messageContentCit }] }}
                                    })
                                    message.channel.send(`A citadel reminder has been added to <#${args[2]}>. **NOTE:** This reminder is to let clan members know the citadel has been reset.`)
                                    client.channels.cache.get("731997087721586698")
                                    .send(`<@${message.author.id}> added a Citadel Reminder in server: **${message.guild.name}** - <#${args[2]}>\n${code}diff\n+ ${messageContentCit}${code}`);
                                }
                            }
                            else if (checkNum(channelTagCit[0], 1, Infinity) && message.guild.channels.cache.has(channelTagCit[0])) {
                                if (messageContentCit) {
                                    settings.findOneAndUpdate({ _id: message.guild.name }, {
                                        $push: { "citadel_reset_time.reminders": { $each: [{ id: message.id, channel: channelTagCit[0], message: messageContentCit }] }}
                                    })
                                    message.channel.send(`A citadel reminder has been added to <#${channelTagCit[0]}>. **NOTE:** This reminder is to let clan members know the citadel has been reset.`)
                                    client.channels.cache.get("731997087721586698")
                                    .send(`<@${message.author.id}> added a Citadel Reminder in server: **${message.guild.name}** - <#${channelTagCit[0]}>\n${code}diff\n+ ${messageContentCit}${code}`);
                                }
                            }
                            else {
                                message.channel.send(`What do you want to set the Citadel Reminders as? Acceptable values:`);
                                message.channel.send(`${code}diff\n+ Channel ID (18 Digits) OR Channel tag (#<Channel name>)\n+ Message content must be provided after the Channel ID/Tag\n\nNOTE:\n- This adds a citadel notification to a specific channel of your choice which lets your clan members know when the citadel has reset. An additional message will display which allows your clan members to help out with the citadel reset time.\n\nExample:\n> ${res.prefix}citadel reminders add <channel> <message>${code}`);
                            }
                    }
                    else {
                        message.channel.send(nEmbed("Permission Denied", "You do not have permission to add a citadel Reminder!", colors.red_dark)
                        .addField("Only the following Roles & Users can:", join, true)
                        .addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
                    }
                    break;
                    case "remove":
                        if (permMod) {
                            let idCheck = [];
                            res.citadel_reset_time.reminders.forEach(x => { idCheck.push(x.id) })
                            if (checkNum(args[2], 1, Infinity) && idCheck.includes(args[2])) {
                                message.channel.send(`Reminder \`${args[2]}\` has been deleted.`);
                                client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> removed a Reminder: \`${args[2]}\``);
                                settings.updateOne({ _id: message.guild.name }, { $pull: { "citadel_reset_time.reminders": { id: args[2] } } })
                            }
                            else if (!args[1]) {
                                message.channel.send(`You must provide an ID to remove.`);
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
                    case "edit":
                        if (permMod) {
                            let editMessage = args.slice(4).join(" ");
                            let param = args.slice(3, 4).join("").toLowerCase()
                            let idCheck = [];
                            res.citadel_reset_time.reminders.forEach(x => { idCheck.push(x.id) })
                            if (checkNum(args[2], 1, Infinity) && idCheck.includes(args[2])) {
                                if (param === "channel") {
                                    if (!args[4]) {
                                        message.channel.send(`You need to specify a channel to change to. Either the channel ID or the channel Tag.`);	
                                    }
                                    else if (args[4].length > 18) {
                                        settings.findOneAndUpdate({ _id: message.guild.name, "citadel_reset_time.reminders.id": args[2] }, { $set: { "citadel_reset_time.reminders.$.channel": args[4] } } )
                                        message.channel.send(`Reminder \`${args[2]}\` has had the channel changed to <#${args[4].slice(2, 20)}>`);
                                        client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Citadel Reminder: \`${args[2]}\``);
                                    }
                                    else {
                                        settings.findOneAndUpdate({ _id: message.guild.name, "citadel_reset_time.reminders.id": args[2] }, { $set: { "citadel_reset_time.reminders.$.channel": args[4] } } )
                                        message.channel.send(`Reminder \`${args[2]}\` has had the channel changed to <#${args[4]}>`);
                                        client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Citadel Reminder: \`${args[2]}\``);}                                    
                                    }
                                else if (param === "message") {
                                    if (!editMessage) {
                                        message.channel.send(`You need to specify the message content you'd like to change.`);
                                    }
                                    else {
                                        settings.findOneAndUpdate({ _id: message.guild.name, "citadel_reset_time.reminders.id": args[2] }, { $set: { "citadel_reset_time.reminders.$.message": editMessage } } )
                                        message.channel.send(`Reminder \`${args[2]}\` has had the message changed to \`${editMessage}\``);
                                        client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> edited a Citadel Reminder: \`${args[2]}\``);
                                    }
                                } 
                                else {
                                    message.channel.send(`You must provide a parameter to edit. You can edit either the \`Channel\` or the \`Message\`.`);
                                }
                            }
                            else if (!args[2]) {
                                message.channel.send(`You must provide an ID to remove.`);
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
                        const citRem = [];
                        res.citadel_reset_time.reminders.forEach(x => {
                            if (x.channel.length > 18) {
                                citRem.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel.slice(2, 20)}>, Date: \`${dayCheck[res.citadel_reset_time.day] || res.citadel_reset_time.day} ${doubleDigits(res.citadel_reset_time.hour)}:${doubleDigits(res.citadel_reset_time.minute)}\`, Message: ${x.message}\n`)
                            } else {
                                citRem.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel}>, Date: \`${dayCheck[res.citadel_reset_time.day] || res.citadel_reset_time.day} ${doubleDigits(res.citadel_reset_time.hour)}:${doubleDigits(res.citadel_reset_time.minute)}\`, Message: ${x.message}\n`)
                            }
                        })
                        if (res.citadel_reset_time.reminders.length === 0) {
                            message.channel.send(`You have no citadel reminders set.`)
                        }
                        else {
                            message.channel.send(`Current Reminders:\n${citRem.join("")}`)
                        }
                    break;
                }
            break;
            case "reset":
                switch (args[1]) {
                    case "set":
                        if (permMod) {
                            if ((checkDate(args[2], 0, 6) || dayCheck.includes(args[2])) && checkDate(args[3], 0, 23) && checkDate(args[4], 0, 59) && args[2] && args[3] && args[4]) { // Setting reset by Day / Hour / Minute
                                await settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "citadel_reset_time.day": dayCheck[args[2]] || args[2], "citadel_reset_time.hour": doubleDigits(args[3]), "citadel_reset_time.minute": doubleDigits(args[4]) }}, { returnOriginal: true })
                                    .then(r => {
                                        message.channel.send(`The Citadel Reset Time has been changed to: ${dayCheck[args[2]] || args[2]} ${doubleDigits(args[3])}:${doubleDigits(args[4])}`)
                                        client.channels.cache.get("731997087721586698")
                                        .send(`<@${message.author.id}> changed the Citadel Reset Time in server: **${message.guild.name}**\n${code}diff\n- ${r.value.citadel_reset_time.day} ${r.value.citadel_reset_time.hour}:${r.value.citadel_reset_time.minute}\n+ ${dayCheck[args[2]] || args[2]} ${doubleDigits(args[3])}:${doubleDigits(args[4])} ${code}`);
                                    })
                            }
                            else if (checkDate(args[2], 0, 23) && checkDate(args[3], 0, 59) && args[2] && args[3]) { // Setting by Hour / Minute
                                await settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "citadel_reset_time.hour": doubleDigits(args[2]), "citadel_reset_time.minute": doubleDigits(args[3]) }}, { returnOriginal: true })
                                    .then(r => {
                                        message.channel.send(`The Citadel Reset Time has been changed to: ${dayCheck[r.value.citadel_reset_time.day] || r.value.citadel_reset_time.day} ${doubleDigits(args[2])}:${doubleDigits(args[3])}`)
                                        client.channels.cache.get("731997087721586698")
                                        .send(`<@${message.author.id}> changed the Citadel Reset Time in server: **${message.guild.name}**\n${code}diff\n- ${r.value.citadel_reset_time.day} ${r.value.citadel_reset_time.hour}:${r.value.citadel_reset_time.minute}\n+ ${dayCheck[r.value.citadel_reset_time.day] || r.value.citadel_reset_time.day} ${doubleDigits(args[2])}:${doubleDigits(args[3])}${code}`);
                                    })
                            }
                            else if (checkDate(args[2], 00, 59) && args[2]) { // Setting by Minute
                                await settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "citadel_reset_time.minute": doubleDigits(args[2]) }}, { returnOriginal: true })
                                    .then(r => {
                                        message.channel.send(`The Citadel Reset Time has been changed to: ${dayCheck[r.value.citadel_reset_time.day] || r.value.citadel_reset_time.day} ${doubleDigits(r.value.citadel_reset_time.hour)}:${doubleDigits(args[2])}`)
                                        client.channels.cache.get("731997087721586698")
                                        .send(`<@${message.author.id}> changed the Citadel Reset Time in server: **${message.guild.name}**\n${code}diff\n- ${r.value.citadel_reset_time.day} ${r.value.citadel_reset_time.hour}:${r.value.citadel_reset_time.minute}\n+ ${dayCheck[r.value.citadel_reset_time.day] || r.value.citadel_reset_time.day} ${doubleDigits(r.value.citadel_reset_time.hour)}:${doubleDigits(args[2])}${code}`);
                                    })
                            }
                            else {
                                message.channel.send(`What do you want to set the Citadel Reset Time to? Acceptable values:`);
                                message.channel.send(`${code}diff\n+ DD HH MM (Sat 14 02)\n+ HH MM (14 02)\n+ MM (02)\n \n\nNOTE:\n- The Reset Time must be the same as Game Time.\n- If specifying a Day, you can use shorthand (Mon), full names (Monday) or numbers (1)!\n- Monday/Mon/1 | Tuesday/Tue/2 | Wednesday/Wed/3 | Thursday/Thu/4 | Friday/Fri/5 | Saturday/Sat/6 | Sunday/Sun/0${code}`);
                            }
                        }
                        else {
                            message.channel.send(nEmbed("Permission Denied", "You do not have permission to change the Citadel Reset Time!", colors.red_dark)
                            .addField("Only the following Roles & Users can:", join, true)
                            .addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
                        }
                    break;
                    case "info":
                        const day = 24 * 60 * 60 * 1000;
                        const hour = 60 * 60 * 1000;
                        const minute = 60 * 1000;
                        let now = Date.now();

                        let msCalc = function(d, h, m) {
                            let msDay = d * day;
                            let msHour = h * hour;
                            let msMin = m * minute;
                            return msDay + msHour + msMin;
                        }
                        if (args[2] && args[3] && args[4]) {
				if (checkDate(args[2], 0, 6)) {
					if (checkDate(args[3], 0, 23)) {
						if (checkDate(args[4], 0, 59)) {
							let newDate = new Date(msCalc(args[2], doubleDigits(args[3]), doubleDigits(args[4])) + now).toUTCString();
							let dateDay = newDate.split(" ")[0].slice(0, 3);
							let dateHour = newDate.split(" ")[4].slice(0, 2);
							let dateMin = newDate.split(" ")[4].slice(3, 5);

							// const filter = (reaction, user) => {
							//     return [`✅`, `❌`].includes(reaction.emoji.name) && user.id !== message.author.id
							// };

							let infoEmbedOne = new Discord.MessageEmbed()
							.setTitle("**Citadel Reset Time Suggestion**")
							.setColor(colors.gold)
							.setDescription(`<@${message.author.id}> used the Citadel Info command to suggest the new Reset Time.`)
							.addFields(
								{ name: "Input", value: `${args[2]} days, ${args[3]} hours and ${args[4]} minutes until Reset.` },
								{ name: "Conversion", value: `${newDate}`, inline: true },
								{ name: "Next Reset Time", value: `${dateDay} ${dateHour}:${dateMin}`, inline: true },
								{ name: "Command", value: `\`${res.prefix}citadel reset set ${dateDay} ${dateHour} ${dateMin}\``, inline: false }
							 )
							.setFooter(
													`Valence Bot created by Luke_#8346`, client.user.displayAvatarURL()
							 )
							.setTimestamp()

							if (args[5]) {
								let array = ["gif", "jpeg", "tiff", "png", "webp", "bmp"]
								console.log(array.some(x => args[5].includes(x)))
								if (array.some(x => args[5].includes(x))) {
									client.channels.cache.get(res.channels.adminChannel).send(infoEmbedOne.setImage(`${args[5]}`))
									message.delete();
									message.reply(`thank you for helping to suggest the Citadel Reset Time. Your response has been recorded!`)
								}
								else {
									message.channel.send(`That is not a valid image URL`)
								}
							}
							else {
								client.channels.cache.get(res.channels.adminChannel).send(infoEmbedOne)
								message.delete();
								message.reply(`thank you for helping to suggest the Citadel Reset Time. Your response has been recorded!`)	
							}

							// .then(async m => 
							//     await m.react(`✅`)
								// await m.react(`❌`)
								// await m.awaitReactions(filter, {max: 1, time: 5000 })
							// )
							// .then(x => x.awaitReactions(filter, {max: 1, time: 5000 }))

						}
						else {
							message.channel.send(`Invalid minute parameter! Minutes range from 00 - 59.`)
						}
					}
					else {
						message.channel.send(`Invalid hour parameter! Hours range from 00 - 23.`)
					}
				}
                        }
			else if (!args[2]) {
				 message.channel.send(`What do you want to suggest the Citadel Reset Time as: Acceptable values:${code}${res.prefix}citadel reset info <days> <hours> <minutes> <image>\n\nNOTE: The image is optional and if included, should show the Citadel Reset Time in the Citadel Management Screen.${code}`);
			}
                        else {
                            message.channel.send(`Invalid day parameter! Days range from 0 - 6.`)
                        }
                    break;
                    default:
                        if (!args[1] && res.citadel_reset_time.day === "*") {
                            message.channel.send(`Your Citadel Reset Time is set as: \`Not set.\``)
                        }
                        else {
                            message.channel.send(`Your Citadel Reset Time is set as: \`${res.citadel_reset_time.day || dayCheck[res.citadel_reset_time.day]} ${res.citadel_reset_time.hour}:${res.citadel_reset_time.minute}\``)
                        }
                    break;
                }
            break;
            case "on":
                if (permAdmin) {
                    if (res.channels.adminChannel === null) {
                        message.channel.send(`You must set your Admin Channel before you set the Citadel notifications.`)
                    } 
                    else {
                        settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "citadel_reset_time.scheduled": true }}, { returnOriginal: true })
                        .then(r => {
                            message.channel.send(`The Citadel Reset Time notifications have been toggled on!`)
                            client.channels.cache.get("731997087721586698")
                            .send(`<@${message.author.id}> toggled the Citadel Reset Time to on in server: **${message.guild.name}**\n${code}diff\n- ${r.value.citadel_reset_time.scheduled}\n+ true${code}`);
                        })
                    }
                }
                else {
                        message.channel.send(nEmbed("Permission Denied", "You do not have permission to toggle the Citadel Reset Time notifications!", colors.red_dark)
                        .addField("Only the following Roles & Users can:", join, true)
                        .addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
                }
            break;
            case "off":
            if (permAdmin) {
                settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "citadel_reset_time.scheduled": false }}, { returnOriginal: true })
                        .then(r => {
                            message.channel.send(`The Citadel Reset Time notifications have been toggled off!`)
                            client.channels.cache.get("731997087721586698")
                            .send(`<@${message.author.id}> toggled the Citadel Reset Time to on in server: **${message.guild.name}**\n${code}diff\n- ${r.value.citadel_reset_time.scheduled}\n+ false${code}`);
                        })
            }
            else {
                    message.channel.send(nEmbed("Permission Denied", "You do not have permission to toggle the Citadel Reset Time notifications!", colors.red_dark)
                    .addField("Only the following Roles & Users can:", join, true)
                    .addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
            }
        break;
            default:
                const { commands } = message.client;
                const com = commands.map(command => {
                    if (command.name === "citadel") {
                        command.usage.shift()
                    return `\`${command.usage.join("\n")}\``
                    }
                });

                message.channel.send(nEmbed(
                    "**Citadel Commands List**",
                    "Here's a list of all the citadel settings:",
                    colors.cyan,
                    client.user.displayAvatarURL()
                )
                .addFields({ name: "**Commands:**", value: com, inline: true }))
            }
        })

       
        




	},
}
