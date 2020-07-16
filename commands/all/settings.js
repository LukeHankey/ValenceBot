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
					if (args[2]) {
						await collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { prefix: args[2] }}, { returnOriginal: true })
						.then(r => {
							console.log(r.value);
							message.channel.send(`Prefix has been changed from \`${r.value.prefix}\` to \`${args[2]}\``)
							client.channels.cache.get("731997087721586698")
							.send(`<@${message.author.id}> changed the bot Prefix in server: **${message.guild.name}**\n${code}diff\n- ${r.value.prefix}\n+ ${args[2]}${code}`);
						})
					}
					else {
						message.channel.send(`What do you want to set the prefix to?`);
					}
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
                    if (checkNum(args[2], 1, Infinity) && (message.guild.roles.cache.has(args[2]) && !message.guild.id)) {
                    await collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { adminRole: `<@&${args[2]}>` }}, { returnOriginal: true })
					.then(r => {
						message.channel.send(`The Admin Role has been changed to: <@&${args[2]}>`)
							client.channels.cache.get("731997087721586698")
							.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.adminRole}\n+ <@&${args[2]}>${code}`);
						})
            }
            else if (roleName) {
                await collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { adminRole: `${roleName}` }}, { returnOriginal: true })
					.then(r => {
						message.channel.send(`The Admin Role has been changed to: <@&${roleName.id}>`)
							client.channels.cache.get("731997087721586698")
							.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.adminRole}\n+ ${roleName}${code}`);
						})
            }
            else if (message.mentions.roles.first()) {
                await collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { adminRole: args[2] }}, { returnOriginal: true })
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
