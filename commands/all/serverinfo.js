const Discord = require("discord.js");
const colors = require("../../colors.json");

module.exports = {
	name: "serverinfo",
	description: ["Provides a link to the server icon."],
	aliases: ["info", "si"],
	usage: "",
	run: async (client, message) => {

		const nEmbed = function(title, color = colors.cyan, thumbnail = "") {
			const embed = new Discord.MessageEmbed()
				.setTitle(title)
				.setColor(color)
				.setThumbnail(thumbnail)
				.setTimestamp();
			return embed;
		}; // Discord Embed

		const date = new Date().toLocaleDateString();

		message.channel.send(nEmbed(
			"Server Info",
			colors.cyan,
			message.guild.iconURL(),
		)
			.setAuthor(`${message.guild.name}`, `${message.guild.iconURL()}`)
			.addFields(
				{ name: "**Guild Name:**", value: `${message.guild.name}`, inline: true },
				{ name: "**Guild Owner:**", value: `${message.guild.owner}`, inline: true },
				{ name: "**Member Count:**", value: `${message.guild.memberCount}`, inline: true },
				{ name: "**Role Count:**", value: `${message.guild.roles.cache.size}`, inline: true },
				{ name: "**Channel Count:**", value: `${message.guild.channels.cache.size}`, inline: true },
			)
			.setFooter(`${client.user.username} | ${date}`, client.user.displayAvatarURL()),
		);
	},
};