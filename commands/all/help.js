const colors = require("../../colors.json");
const func = require("../../functions.js")
const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "help",
	description: ["List all of my commands or info about a specific command."],
	aliases: ["commands"],
	usage: ["command name"],
	guildSpecific: 'all',
	run: async (client, message, args) => {
		const { commands } = message.client;
		const db = getDb();
		const settings = db.collection(`Settings`)
		
		settings.findOne({ _id: message.guild.id })
		.then(res => {
			if (!args.length) {
				const com = commands.map(command => {
					if (command.guildSpecific.includes(message.guild.id) || command.guildSpecific === 'all') {
						return `\`${command.name}\``
					}
				});
				const join = com.filter(x => x).join("|");

				message.channel.send(func.nEmbed(
					"**Help Commands List**",
					"Here's a list of all my commands:",
					colors.cyan,
					message.author.displayAvatarURL(),
					client.user.displayAvatarURL()
				)
					.addFields(
						{ name: "**Commands:**", value: join, inline: false },
						{ name: `**The bot prefix is: ${res.prefix}**`, value: `\nYou can send \`${res.prefix}help [command name]\` to get info on a specific command!`, inline: false },
					),
				);
			}
			else {
				const name = args[0];
				const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
				let otherView = ["Lotto", "Calendar", "Profile", "Dsf"]

				const cName = func.capitalise(command.name);
				const fields = [];

					for (let i = 0; i < command.usage.length; i++) {
						if (otherView.includes(cName)) {
							const field = { name: `🔹 ${res.prefix}${cName} ${command.usage[i] || ""}`, value: `${command.description[i]}`, inline: false };
							fields.push(field);
						} else {
							const field = { name: `🔹 ${res.prefix}${cName} ${command.usage[i] || ""}`, value: `${command.description[i]}`, inline: true };
							fields.push(field);
					}
					// console.log(field);
				}

				message.channel.send(func.nEmbed(
					`**Command:** ${cName}`,
					`**Aliases:** ${command.aliases.join(", ") || "[NO ALIASES]"}\n**Usage:**`,
					colors.aqua,
					message.member.user.displayAvatarURL(),
					client.user.displayAvatarURL(),
				)
					.addFields(fields),
				);
			}
		})
	},
};