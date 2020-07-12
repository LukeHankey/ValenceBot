/* eslint-disable no-useless-escape */
const Discord = require("discord.js");
const colors = require("../../colors.json");
const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "user",
	description: ["Displays information about the specified user.", "Displays your Discord ID."],
	aliases: ["u"],
	usage:  ["info <rsn>", "discord"],
	run: async (client, message, args) => {
		// function capitalize(str) {
		// 	return str.charAt(0).toUpperCase() + str.slice(1);
		// } // Capitalization

		const nEmbed = function(title, description, color = colors.red_dark, thumbnail = "") {
			const embed = new Discord.MessageEmbed()
				.setTitle(title)
				.setDescription(description)
				.setColor(color)
				.setThumbnail(thumbnail)
				.setTimestamp();
			return embed;
		}; // Discord Embed

		if (!args[0]) {
			console.log("No argument given");
			message.channel.send(
				nEmbed(
					"Error: Command Invalid",
					"Pass in an argument for this command to work. Try: \`_help user\` to see the list of available user commands.",
				),
			);
		}
		else if ((args[0] === "info" || args[0] === "i") && !args[1]) {
			console.log("No User Provided");
			message.channel.send(
				nEmbed(
					"Error: No user given",
					"Derp. You have to pass in a user to see some information. :man_facepalming:",
				),
			);
		}
		const db = getDb();
		const userColl = db.collection("Users");

		const user = args.slice(1).join(" ").toUpperCase();

		console.log(user);
		if (user && (args[0] === "info" || args[0] === "i")) {
			userColl.findOne({ _id: `${user}` })
				.then((res, err) => {
					if (res) {
						message.channel.send(
							nEmbed(
								`${res.Clanmate} **- User Info**`,
								"Valence",
								colors.blue_light,
								client.user.displayAvatarURL(),
							)
								.addFields(
									{ name: "Clan Rank", value: res[" Clan Rank"], inline: true },
									{ name: "Clan Experience", value: res[" Total XP"], inline: true },
									// { name: "Clan Kills", value: res[" Kills"], inline: true },
									{ name: "Total Clan Points", value: res["Total Points"], inline: true },
									{ name: "Events", value: res.Events, inline: true },
									{ name: "Recruits", value: res.Recruits, inline: true },
									{ name: "Number of Events + Recruits", value: res["Events & Recruits"], inline: true },
									{ name: "Donation Points", value: res["Donation Points"], inline: true },
									{ name: "Citadel Status", value: "Capped", inline: true },
								),
						);
					}
					else {
						console.error(err);
					}
				});
		}
		else if (args[0] === "discord" || args[0] === "d" || args[0] === "discordID") {
			message.channel.send(`Your Discord ID is: ${message.member.id}`);
		}

		// });

	},
};