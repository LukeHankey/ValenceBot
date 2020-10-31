const colors = require("../../colors.json");
const getDb = require("../../mongodb").getDb;
const func = require("../../functions.js")

module.exports = {
	name: "settings",
	description: ["Displays the settings that you can change.", "Shows the current prefix.", "Sets the new prefix in the server.", "Shows the current admin role.", "Sets the new admin role in the server.", "Shows the current mod role.", "Sets the new mod role in the server.", "Shows the current admin channel.", "Sets the current admin channel."],
	aliases: ["s"],
	usage: ["", "prefix", "prefix set <new prefix>", "adminRole", "adminRole set <new role>", "modRole", "modRole set <new role>", "adminChannel", "adminChannel set <channel>"],
	guildSpecific: ["472448603642920973", "733164313744769024", "668330890790699079"],
	run: async (client, message, args, perms) => {
		const code = "```";
        const db = getDb();
        const settings = db.collection(`Settings`)
		
		await settings.findOne({ _id: message.guild.name })
		.then(async res => {

		switch (args[0]) {
			case "prefix":
				switch (args[1]) {
					case "set":						
						if (perms.admin) {
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
								message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to change the prefix!", colors.red_dark)
								.addField("Only the following roles can:", perms.joinA, true)
								.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
								return
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
						if (perms.admin) {
								if (func.checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2] && message.guild.roles.cache.get(`${args[2]}`).permissions.has("ADMINISTRATOR")) { // Setting role by ID
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
							message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to change the Admin Role!", colors.red_dark)
							.addField("Only the following Roles & Users can:", perms.joinA, true)
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
						if (perms.admin) {
							if (func.checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2] && message.guild.roles.cache.get(`${args[2]}`).permissions.has(["KICK_MEMBERS", "BAN_MEMBERS"])) { // Setting role by ID
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
							message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to change the Mod Role!", colors.red_dark)
							.addField("Only the following Roles & Users can:", perms.joinA, true)
							.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
						}
					break;
				default:
					if (!args[1]) {
							message.channel.send(`Your Mod Role is set as: ${res.roles.modRole}`, { "allowedMentions": { "parse" : []}})
					}
				}
			break;

			break;
			case "adminChannel":
				switch (args[1]) {
					case "set":
						if (perms.admin) {
							const channelTag = [];
							if (args[2] === undefined) {
								channelTag.push("false")
							}
							else {
								channelTag.push(args[2].slice(2, 20))
							}
							if (func.checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2]) && message.guild.id !== args[2]) { // Check by ID
								settings.findOneAndUpdate({ _id: message.guild.name }, { $set: { "channels.adminChannel": args[2] }}, { returnOriginal: true })
								.then(r => {
									message.channel.send(`The Admin Channel has been set to: <#${args[2]}>`)
									client.channels.cache.get("731997087721586698")
									.send(`<@${message.author.id}> set the Admin Channel in server: **${message.guild.name}** from <#${r.value.channels.adminChannel}> to <#${args[2]}>`);
								})
							}
							else if (func.checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) { // Check by #Channel
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
							message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to set the Admin Channel!", colors.red_dark)
							.addField("Only the following Roles & Users can:", perms.joinA, true)
							.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
						}
				break;
				default:
					if (!args[1] && perms.admin) {
						message.channel.send(`Your Admin Channel is set as: <#${res.channels.adminChannel}>`)
					}
					else {
						message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to see the Admin Channel!", colors.red_dark))
					}
				}
			break;
			default:
				if (!args[0]) {
						message.channel.send(func.nEmbed(
						"**Settings List**",
						"Here's a list of all the settings you can change:",
						colors.cyan,
						client.user.displayAvatarURL()
					)
					.addFields(
						{ name: "**Settings**", value: `\`prefix\`\n\`adminRole\`\n\`modRole\`\n\`adminChannel\``, inline: false }
					))
				}
				else {
					return;
				}
			} 
		})
    },
};