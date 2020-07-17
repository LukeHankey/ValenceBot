const colors = require("../../colors.json");
const Discord = require("discord.js");
const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "settings",
	description: ["Displays the settings that you can change.", "Shows the current prefix.", "Sets the new prefix in the server."],
	aliases: ["s"],
	usage: ["", "prefix", "prefix set <new prefix>"],
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
    
	const code = "```";
        const db = getDb();
        const collection = db.collection(`Settings`)
		
	switch (args[0]) {
		case "prefix":
			switch (args[1]) {
				case "set":
					await collection.findOne({ _id: message.guild.name })
    				.then(res => {
						let rID = res.adminRole.slice(3, 21) // Get adminRole ID
						let adRole = message.guild.roles.cache.find(role => role.id === rID); // Grab the adminRole object by ID
						let oRoles = message.guild.roles.cache.filter(roles => roles.rawPosition >= adRole.rawPosition); // Grab all roles rawPosition that are equal to or higher than the adminRole
						let filterORoles = oRoles.map(role => role.id); // Finds the ID's of available roles
						let abovePerm = [];
						let availPerm = [];
						filterORoles.forEach(id => {
							if (message.member.roles.cache.has(id)) {
								abovePerm.push(id)
							}
							else {
								availPerm.push(id);
							}
						})

						let perm = message.member.roles.cache.has(abovePerm[0]) || message.member.roles.highest === message.guild.roles.highest || adRole.rawPosition <= message.member.roles.highest.rawPosition || message.member.roles.cache.has(rID) || message.author.id === message.guild.ownerID;
						if (args[2] && perm) {
							collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { prefix: args[2] }}, { returnOriginal: true })
							.then(r => {
								message.channel.send(`Prefix has been changed from \`${r.value.prefix}\` to \`${args[2]}\``)
								client.channels.cache.get("731997087721586698")
								.send(`<@${message.author.id}> changed the bot Prefix in server: **${message.guild.name}**\n${code}diff\n- ${r.value.prefix}\n+ ${args[2]}${code}`);
							})
						}
						else if (args[2] && !perm) {
							const allRoleIDs = availPerm.map(id => `<@&${id}>`);
							const join = allRoleIDs.join(", ")
							message.channel.send(nEmbed("Permission Denied", "You do not have permission to change the prefix!", colors.red_dark)
							.addField("Only the following roles can:", join ))
						}
						else {
							message.channel.send(`What do you want to set the prefix to?`);
						}
					})
					break;
				default:
					if (!args[1]) {
						await collection.findOne({ _id: `${message.guild.name}` })
						.then(res => {
							message.channel.send(`Your prefix is set as: \`${res.prefix}\``)
						})
					}
				}
			break;
		case "adminRole":
			switch (args[1]) {
				case "set":
                    let roleArg = args.slice(2).join(" ");
					let roleName = message.guild.roles.cache.find(role => role.name === roleArg)

					await collection.findOne({ _id: message.guild.name })
    				.then(res => {

						let rID = res.adminRole.slice(3, 21) // Get adminRole ID
						let adRole = message.guild.roles.cache.find(role => role.id === rID); // Grab the adminRole object by ID
						let oRoles = message.guild.roles.cache.filter(roles => roles.rawPosition >= adRole.rawPosition); // Grab all roles rawPosition that are equal to or higher than the adminRole
						let filterORoles = oRoles.map(role => role.id); // Finds the ID's of available roles
						let abovePerm = []; // All roles that the member has that is >= adminRole
						let availPerm = [];
						filterORoles.forEach(id => {
							if (message.member.roles.cache.has(id)) {
								abovePerm.push(id)
							}
							else {
								availPerm.push(id);
							}
						})
						let idFilter = []; // Roles not on the member
						filterORoles.filter(id => {
							if (!abovePerm.includes(id)) {
								idFilter.push(id) 
							}
						})
						let ardID = message.guild.roles.cache.find(role => role.id === args[2])
						
						let aboveRP = [];
						abovePerm.forEach(id => {
							let abovePermRaw = message.guild.roles.cache.find(role => role.id === id)
							let aboveRp = abovePermRaw.rawPosition + "";
							aboveRp.split().forEach(rp => {
								aboveRP.push(rp);
							})
						})

						let perm = message.member.roles.cache.has(abovePerm[0]) || message.member.roles.cache.has(rID) || message.author.id === message.guild.ownerID;
						if (perm) {
						if (checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2]) { // Setting role by ID
							if (ardID.rawPosition >= adRole.rawPosition && ardID.rawPosition > aboveRP) {
								message.channel.send("You cannot set the admin role higher than the role you have")
							} 
							else {
								collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { adminRole: `<@&${args[2]}>` }}, { returnOriginal: true })
								.then(r => {
									message.channel.send(`The Admin Role has been changed to: <@&${args[2]}>`)
									client.channels.cache.get("731997087721586698")
									.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.adminRole}\n+ <@&${args[2]}>${code}`);
								})
							}
						}
						else if (roleName) { // Setting role by name
							collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { adminRole: `${roleName}` }}, { returnOriginal: true })
								.then(r => {
									message.channel.send(`The Admin Role has been changed to: <@&${roleName.id}>`)
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.adminRole}\n+ ${roleName}${code}`);
									})
						}
						else if (message.mentions.roles.first()) { // Setting role by mention
							collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { adminRole: args[2] }}, { returnOriginal: true })
								.then(r => {
									message.channel.send(`The Admin Role has been changed to: ${args[2]}`)
										client.channels.cache.get("731997087721586698")
										.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.adminRole}\n+ ${args[2]}${code}`);
									})
						}
						else {
							message.channel.send(`What do you want to set the Admin Role to? Acceptable values:`);
							message.channel.send(`${code}diff\n+ Role ID\n+ Tagging the role\n+ Role Name\n\nNOTE: If specifying a Role Name, make sure the Role Name is unique!${code}`);
							// Check that the role being set has the _ADMINISTRATOR_ permission
						}
					}
					else {
						const allRoleIDs = availPerm.map(id => `<@&${id}>`);
						const join = allRoleIDs.join(", ")
						message.channel.send(nEmbed("Permission Denied", "You do not have permission to change the Admin Role!", colors.red_dark)
						.addField("Only the following Roles & Users can:", join, true)
						.addField(`\u200b`, `<@${message.guild.ownerID}>`, true))
					}
				})
				break;
				default:
					if (!args[1]) {
						await collection.findOne({ _id: `${message.guild.name}` })
						.then(res => {
							message.channel.send(`Your Admin Role is set as: ${res.adminRole}`)
						})
					}
			}
			break;
		default:
			if (!args[0]) {
				collection.find({}).toArray().then(res => {
					const key1 = Object.keys(res[0]).slice(2, 3).join("");
					const key2 = Object.keys(res[0]).slice(3, 4).join("");
					message.channel.send(nEmbed(
						"**Settings List**",
						"Here's a list of all the settings you can change:",
						colors.cyan,
						client.user.displayAvatarURL()
					)
						.addFields(
							{ name: "**Settings**", value: `\`${key1}\`\n\`${key2}\``, inline: false }
						)
					)
				})
		}
		else {
			return;
		}
	}
    },
};
