const Discord = require("discord.js");
const { prefix } = require("../../config.json");
const colors = require("../../colors.json");

module.exports = {
	name: "help",
	description: "List all of my commands or info about a specific command.",
	aliases: ["commands"],
	usage: "[command name]",
	run: async (client, message, args) => {
		function capitalize(str) {
			return str.charAt(0).toUpperCase() + str.slice(1);
		}

		const { commands } = message.client;

		const nEmbed = function(title, description, color = colors.cyan, thumbnail = "", author = "") {
			const embed = new Discord.MessageEmbed()
				.setTitle(title)
				.setDescription(description)
				.setColor(color)
				.setThumbnail(thumbnail)
				.setAuthor(author)
				.setTimestamp();
			return embed;
		}; // Discord Embed

		if (!args.length) {
			const com = commands.map(command => `\`${command.name}\``);
			const join = com.join("|");

			message.channel.send(nEmbed(
				"**Help Commands List**",
				"Here's a list of all my commands:",
				colors.cyan,
				client.user.displayAvatarURL(),
			)
				.addFields(
					{ name: "**Commands:**", value: join, inline: false },
					{ name: `**The bot prefix is: ${prefix}**`, value: `\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`, inline: false },
				),
			);
		}
		else {
			const name = args[0];
			const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

			const cName = capitalize(command.name);
			const fields = [];

			for (let i = 0; i < command.usage.length; i++) {
				const field = { name: `🔹 ${prefix}${cName} ${command.usage[i] || ""}`, value: `${command.description[i]}`, inline: true };
				fields.push(field);
				// console.log(field);
			}

			message.channel.send(nEmbed(
				`**Command:** ${cName}`,
				`**Aliases:** ${command.aliases.join(", ") || "[NO ALIASES]"}\n**Usage:**`,
				colors.aqua,
				message.member.user.displayAvatarURL(),
				"Valence Bot Help", client.user.displayAvatarURL(),
			)
				.addFields(fields),
			);
		}
	},
};