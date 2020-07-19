const colors = require("../../colors.json");
const Discord = require("discord.js");
const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "settings",
	description: ["Displays the settings that you can change.", "Shows the current prefix.", "Sets the new prefix in the server.", "Shows the current admin role.", "Sets the new admin role in the server.", "Shows the current mod role.", "Sets the new mod role in the server.", "Shows the current Citadel Reset Time.", "Sets the Citadel Reset Time.", "Toggle the Citadel Reset Time notifications.", "Shows the current admin channel.", "Sets the current admin channel."],
	aliases: ["s"],
	usage: ["", "prefix", "prefix set <new prefix>", "adminRole", "adminRole set <new role>", "modRole", "modRole set <new role>", "citadel", "citadel set <date/time>", "citadel <on/off>", "adminChannel", "adminChannel set <channel>"],
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
		.then(res => {
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
			const roleArg = args.slice(2).join(" ");
			const roleName = message.guild.roles.cache.find(role => role.name === roleArg)
			const ardID = message.guild.roles.cache.find(role => role.id === args[2])
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
			const dayCheck = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
			let permMod = message.member.roles.cache.has(abovePermModArray[0]) || message.member.roles.cache.has(mrID) || aboveRPMod[0] >= modRole.rawPosition || message.author.id === message.guild.ownerID;

		switch (args[0]) {
			case "prefix":
				switch (args[1]) {
					case "set":						
						if (permAdmin) {
							if (args[2]) {
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { prefix: args[2] }}, { returnOriginal: true })
								.then(r => {
									message.channel.send(`Prefix has been changed from \`${r.value.prefix}\` to \`${args[2]}\``)
									client.channels.cache.get("731997087721586698")
									.send(`<@${message.author.id}> changed the bot Prefix in server: **${message.guild.name}**\n${code}diff\n- ${r.value.prefix}\n+ ${args[2]}${code}`);
								})
							}
							else {
								message.channel.send(`What do you want to set the prefix to?`);
							}
						}
						else {
							message.channel.send(nEmbed("Permission Denied", "You do not have permission to change the prefix!", colors.red_dark)
							.addField("Only the following roles can:", join, true)
							.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
						}
					break;
				default:
					if (!args[1]) {
							message.channel.send(`Your prefix is set as: \`${res.prefix}\``)
					}
				}
			break;
			case "adminRole":
				switch (args[1]) {
					case "set":
						if (permAdmin) {
								if (checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2] && message.guild.roles.cache.get(`${args[2]}`).permissions.has("ADMINISTRATOR")) { // Setting role by ID
									if (ardID.rawPosition >= adRole.rawPosition && ardID.rawPosition > aboveRP && message.author.id !== message.guild.ownerID) {
										message.channel.send("You cannot set the Admin role higher than the role you have.")
									} 
									else {
										settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "roles.adminRole": `<@&${args[2]}>` }}, { returnOriginal: true })
										.then(r => {
											message.channel.send(`The Admin Role has been changed to: <@&${args[2]}>`, { "allowedMentions": { "parse" : []}})
											client.channels.cache.get("731997087721586698")
											.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.roles.adminRole}\n+ <@&${args[2]}>${code}`);
										})
									}
								}
								else if (roleName && message.guild.roles.cache.get(roleName.id).permissions.has("ADMINISTRATOR")) { // Setting role by name
									if (roleName.rawPosition >= adRole.rawPosition && roleName.rawPosition > aboveRP && message.author.id !== message.guild.ownerID) {
										message.channel.send("You cannot set the Admin role higher than the role you have.") // Update to make better message.
									} 
									else {
										settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "roles.adminRole": `${roleName}` }}, { returnOriginal: true })
											.then(r => {
												message.channel.send(`The Admin Role has been changed to: <@&${roleName.id}>`, { "allowedMentions": { "parse" : []}})
													client.channels.cache.get("731997087721586698")
													.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.roles.adminRole}\n+ ${roleName}${code}`);
											})
										}
								}
								else if (message.mentions.roles.first() && message.guild.roles.cache.get(message.mentions.roles.first().id).permissions.has("ADMINISTRATOR")) { // Setting role by mention
								const mentionID = message.mentions.roles.first().id;
								const mentionRole = message.guild.roles.cache.find(role => role.id === mentionID)
								if (mentionRole.rawPosition >= adRole.rawPosition && mentionRole.rawPosition > aboveRP && message.author.id !== message.guild.ownerID) {
									message.channel.send("You cannot set the Admin role higher than the role you have.") // Update to make better message.
								} 
								else {
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "roles.adminRole": args[2] }}, { returnOriginal: true })
									.then(r => {
										message.channel.send(`The Admin Role has been changed to: ${args[2]}`, { "allowedMentions": { "parse" : []}})
											client.channels.cache.get("731997087721586698")
											.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.roles.adminRole}\n+ ${args[2]}${code}`);
									})
								}
							}
							else {
								message.channel.send(`What do you want to set the Admin Role to? Acceptable values:`);
								message.channel.send(`${code}diff\n+ Role ID\n+ Tagging the role\n+ Role Name\n\nNOTE:\n- If specifying a Role Name, make sure the Role Name is unique!\n- All roles must have the ADMINISTRATOR permission set.${code}`);
							}
						}
						else {
							const allRoleIDs = availPerm.map(id => `<@&${id}>`);
							const join = allRoleIDs.join(", ")
							message.channel.send(nEmbed("Permission Denied", "You do not have permission to change the Admin Role!", colors.red_dark)
							.addField("Only the following Roles & Users can:", join, true)
							.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
						}
					break;
				default:
					if (!args[1]) {
						settings.findOne({ _id: `${message.guild.name}` })
						.then(res => {
							message.channel.send(`Your Admin Role is set as: ${res.roles.adminRole}`, { "allowedMentions": { "parse" : []}})
						})
					}
				}
				break;
			case "modRole":
				switch (args[1]) {
					case "set":							
						if (permAdmin) {
							if (checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2] && message.guild.roles.cache.get(`${args[2]}`).permissions.has(["KICK_MEMBERS", "BAN_MEMBERS"])) { // Setting role by ID
									settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "roles.modRole": `<@&${args[2]}>` }}, { returnOriginal: true })
									.then(r => {
										message.channel.send(`The Mod Role has been changed to: <@&${args[2]}>`, { "allowedMentions": { "parse" : []}})
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.roles.modRole}\n+ <@&${args[2]}>${code}`);
									})
							}
							else if (roleName && message.guild.roles.cache.get(roleName.id).permissions.has(["KICK_MEMBERS", "BAN_MEMBERS"])) { // Setting role by name
									settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "roles.modRole": `${roleName}` }}, { returnOriginal: true })
									.then(r => {
										message.channel.send(`The Mod Role has been changed to: <@&${roleName.id}>`, { "allowedMentions": { "parse" : []}})
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.roles.modRole}\n+ ${roleName}${code}`);
									})
							}
							else if (message.mentions.roles.first() && message.guild.roles.cache.get(message.mentions.roles.first().id).permissions.has(["KICK_MEMBERS", "BAN_MEMBERS"])) { // Setting role by mention
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "roles.modRole": args[2] }}, { returnOriginal: true })
									.then(r => {
										message.channel.send(`The Mod Role has been changed to: ${args[2]}`, { "allowedMentions": { "parse" : []}})
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.roles.modRole}\n+ ${args[2]}${code}`);
									})
							}
							else {
								message.channel.send(`What do you want to set the Mod Role to? Acceptable values:`);
								message.channel.send(`${code}diff\n+ Role ID\n+ Tagging the role\n+ Role Name\n\nNOTE:\n- If specifying a Role Name, make sure the Role Name is unique!\n- All roles must have the KICK_MEMBERS & BAN_MEMBERS permission set.${code}`);
							}
						}
						else {
							const allRoleIDs = availPerm.map(id => `<@&${id}>`);
							const join = allRoleIDs.join(", ")
							message.channel.send(nEmbed("Permission Denied", "You do not have permission to change the Mod Role!", colors.red_dark)
							.addField("Only the following Roles & Users can:", join, true)
							.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
						}
					break;
				default:
					if (!args[1]) {
							message.channel.send(`Your Mod Role is set as: ${res.roles.modRole}`, { "allowedMentions": { "parse" : []}})
					}
				}
			break;
			case "citadel":
				switch (args[1]) {
					case "set":
						if (permMod) {
							if ((checkDate(args[2], 0, 6) || dayCheck.includes(args[2])) && checkDate(args[3], 1, 23) && checkDate(args[4], 1, 59)) { // Setting reset by Day / Hour /
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "citadel_reset_time.day": dayCheck[args[2]] || args[2], "citadel_reset_time.hour": doubleDigits(args[3]), "citadel_reset_time.minute": doubleDigits(args[4]) }}, { returnOriginal: true })
									.then(r => {
										message.channel.send(`The Citadel Reset Time has been changed to: ${dayCheck[args[2]] || args[2]} ${doubleDigits(args[3])}:${doubleDigits(args[4])}`)
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> changed the Citadel Reset Time in server: **${message.guild.name}**\n${code}diff\n- ${r.value.citadel_reset_time.day} ${r.value.citadel_reset_time.hour}:${r.value.citadel_reset_time.minute}\n+ ${dayCheck[args[2]] || args[2]} ${doubleDigits(args[3])}:${doubleDigits(args[4])} ${code}`);
									})
							}
							else if (checkDate(args[2], 1, 23) && checkDate(args[3], 1, 59)) {
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "citadel_reset_time.hour": doubleDigits(args[2]), "citadel_reset_time.minute": doubleDigits(args[3]) }}, { returnOriginal: true })
									.then(r => {
										message.channel.send(`The Citadel Reset Time has been changed to: ${dayCheck[r.value.citadel_reset_time.day] || r.value.citadel_reset_time.day} ${doubleDigits(args[2])}:${doubleDigits(args[3])}`)
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> changed the Citadel Reset Time in server: **${message.guild.name}**\n${code}diff\n- ${r.value.citadel_reset_time.day} ${r.value.citadel_reset_time.hour}:${r.value.citadel_reset_time.minute}\n+ ${dayCheck[r.value.citadel_reset_time.day] || r.value.citadel_reset_time.day} ${doubleDigits(args[2])}:${doubleDigits(args[3])}${code}`);
									})
							}
							else if (checkDate(args[2], 1, 59)) {
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "citadel_reset_time.minute": doubleDigits(args[2]) }}, { returnOriginal: true })
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
							const allRoleIDs = availPermMod.map(id => `<@&${id}>`);
							const join = allRoleIDs.join(", ")
							message.channel.send(nEmbed("Permission Denied", "You do not have permission to change the Citadel Reset Time!", colors.red_dark)
							.addField("Only the following Roles & Users can:", join, true)
							.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
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
								const allRoleIDs = availPerm.map(id => `<@&${id}>`);
								const join = allRoleIDs.join(", ")
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
							const allRoleIDs = availPerm.map(id => `<@&${id}>`);
							const join = allRoleIDs.join(", ")
							message.channel.send(nEmbed("Permission Denied", "You do not have permission to toggle the Citadel Reset Time notifications!", colors.red_dark)
							.addField("Only the following Roles & Users can:", join, true)
							.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
					}
				break;
					default:
					if (!args[1] && res.citadel_reset_time.day === "*") {
						message.channel.send(`Your Citadel Reset Time is set as: \`Not set.\``)
					}
					else {
						message.channel.send(`Your Citadel Reset Time is set as: \`${res.citadel_reset_time.day || dayCheck[res.citadel_reset_time.day]} ${res.citadel_reset_time.hour}:${res.citadel_reset_time.minute}\``)
					}
				}
			break;
			case "adminChannel":
				switch (args[1]) {
					case "set":
						if (permAdmin) {
							const channelTag = [];
							if (args[2] === undefined) {
								channelTag.push("false")
							}
							else {
								channelTag.push(args[2].slice(2, 20))
							}
							if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2]) && message.guild.id !== args[2]) { // Check by ID
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "channels.adminChannel": args[2] }}, { returnOriginal: true })
								.then(r => {
									message.channel.send(`The Admin Channel has been set to: <#${args[2]}>`)
									client.channels.cache.get("731997087721586698")
									.send(`<@${message.author.id}> set the Admin Channel in server: **${message.guild.name}** from <#${r.value.channels.adminChannel}> to <#${args[2]}>`);
								})
							}
							else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0]) && message.guild.id !== channelTag[0]) {
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "channels.adminChannel": channelTag[0] }}, { returnOriginal: true })
								.then(r => {
									message.channel.send(`The Admin Channel has been set to: <#${channelTag[0]}>`)
									client.channels.cache.get("731997087721586698")
									.send(`<@${message.author.id}> set the Admin Channel in server: **${message.guild.name}** from <#${r.value.channels.adminChannel}> to <#${channelTag[0]}>`);
								})
							}
							else {
								message.channel.send(`What do you want to set the Admin Channel to? Acceptable values:`);
								message.channel.send(`${code}diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)${code}`);
							}
						}
						else {
							const allRoleIDs = availPerm.map(id => `<@&${id}>`);
							const join = allRoleIDs.join(", ")
							message.channel.send(nEmbed("Permission Denied", "You do not have permission to set the Admin Channel!", colors.red_dark)
							.addField("Only the following Roles & Users can:", join, true)
							.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
						}
				break;
				default:
					if (!args[1] && permAdmin) {
						message.channel.send(`Your Admin Channel is set as: <#${res.channels.adminChannel}>`)
					}
					else {
						message.channel.send(nEmbed("Permission Denied", "You do not have permission to see the Admin Channel!", colors.red_dark))
					}
				}
			break;
			default:
				if (!args[0]) {
						message.channel.send(nEmbed(
						"**Settings List**",
						"Here's a list of all the settings you can change:",
						colors.cyan,
						client.user.displayAvatarURL()
					)
					.addFields(
						{ name: "**Settings**", value: `\`prefix\`\n\`adminRole\`\n\`modRole\`\n\`citadel\`\n\`adminChannel\``, inline: false }
					))
				}
				else {
					return;
				}
			} 
		})
    },
};
