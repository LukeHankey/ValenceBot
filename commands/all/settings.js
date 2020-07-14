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
    
	const code = "```";
        const db = getDb();
        const collection = db.collection(`Settings`)
<<<<<<< HEAD

        if (!args[0]) {
            collection.find({}).toArray().then(res => {
                // console.log(Object.keys(res[0]).slice(2, 3).join(""));
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

        if (args[0] === "prefix" && (!args[1])) {
            await collection.findOne({ _id: `${message.guild.name}` })
            .then(res => {
                message.channel.send(`Your prefix is set as: \`${res.prefix}\``)
            })
        }

        if (args[0] === "prefix" && (args[1] === "set") && args[2]) {
            // await collection.findOne({ _id: message.guild.name })
            // .then(res => {
                // console.log(res);
            await collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { prefix: args[2] }}, { returnOriginal: true })
            .then(r => {
                console.log(r.value);
                message.channel.send(`Prefix has been changed from \`${r.value.prefix}\` to \`${args[2]}\``)
						client.channels.cache.get("731997087721586698")
						.send(`<@${message.author.id}> changed the bot Prefix in server: **${message.guild.name}**\n${code}diff\n- ${r.value.prefix}\n+ ${args[2]}${code}`);
            })
            // })
        }
||||||| 2647ff5

        if (!args[0]) {
            collection.find({}).toArray().then(res => {
                console.log(Object.keys(res[0]).slice(2, 3).join(""));
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

        if (args[0] === "prefix" && (!args[1])) {
            await collection.findOne({ _id: `${message.guild.name}` })
            .then(res => {
                message.channel.send(`Your prefix is set as: \`${res.prefix}\``)
            })
        }

        if (args[0] === "prefix" && (args[1] === "set") && args[2]) {
            // await collection.findOne({ _id: message.guild.name })
            // .then(res => {
                // console.log(res);
            await collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { prefix: args[2] }}, { returnOriginal: true })
            .then(r => {
                console.log(r.value);
                message.channel.send(`Prefix has been changed from \`${r.value.prefix}\` to \`${args[2]}\``)
						client.channels.cache.get("731997087721586698")
						.send(`<@${message.author.id}> changed the bot Prefix in server: **${message.guild.name}**\n${code}diff\n- ${r.value.prefix}\n+ ${args[2]}${code}`);
            })
            // })
        }
=======
		
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
					if (args[2]) {
					await collection.findOneAndUpdate({ _id: message.guild.name }, { $set: { adminRole: args[2] }}, { returnOriginal: true })
					.then(r => {
						message.channel.send(`Prefix has been changed from \`${r.value.adminRole}\` to \`${args[2]}\``)
							client.channels.cache.get("731997087721586698")
							.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n${code}diff\n- ${r.value.prefix}\n+ ${args[2]}${code}`);
						})
			}
			else {
				message.channel.send(`What do you want to set the Admin Role to? Acceptable values:`);
				message.channel.send(`${code}diff\n+ Role ID (Current ID)\n+ Tagging the role (@currentRole)\n+ Role Name (Current Role Name)${code}`)
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
>>>>>>> 24593bfeeb8b84c9482cbd4f7cbfaf5832892005
    },
};
