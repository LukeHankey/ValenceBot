const colors = require("../../colors.json");
const Discord = require("discord.js");
const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "settings",
	description: ["Displays the settings that you can change."],
	aliases: ["s"],
	usage: [""],
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

                if (!args[0]) {
                    const col = collection.find({});
                    col.toArray().then(res => {
                        // console.log(res);
                    res.map(doc => {
                        const key1 = Object.keys(doc).slice(2, 3).join("")
                        const key2 = Object.keys(doc).slice(3, 4).join("")

                        message.channel.send(nEmbed(
                            "**Settings List**",
                            "Here's a list of all the settings you can change:",
                            colors.cyan,
                            client.user.displayAvatarURL()
                        )
                        .addFields(
                            { name: "**Settings**", value: `\`${key1}\`\n\`${key2}\``, inline: false },
                        )
                    );
                })
            })
        }

        if (args[0] === "prefix" && (!args[1])) {
            await collection.findOne({ _id: "prefix"})
            .then(res => {
                message.channel.send(`Your prefix is set as: \`${res.prefix}\``)
            })
        }

        if (args[0] === "prefix" && (args[1] === "set") && args[2]) {
            await collection.findOne({ _id: "prefix"})
            .then(res => {
            collection.findOneAndUpdate({ prefix: res.prefix }, { $set: { prefix: args[2] }}, { returnOriginal: false })
            .then(r => {
                console.log(r.value);
                message.channel.send(`Prefix has been changed from \`${res.prefix}\` to \`${r.value.prefix}\``)
						client.channels.cache.get("731997087721586698")
						.send(`<@${message.author.id}> changed the bot Prefix in server: **${message.guild.name}**\n${code}diff\n- ${res.prefix}\n+ ${r.value.prefix}${code}`);
            })
            })
        }
    },
};