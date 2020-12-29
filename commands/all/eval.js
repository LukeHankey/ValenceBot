/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

module.exports = {
	name: "eval",
	description: ["Evaluates code."],
	aliases: [""],
	usage:  ["<code>"],
	guildSpecific: ['668330890790699079', '733164313744769024' ],
	run: async (client, message, args, perms, channels) => {
        if (!perms.owner) {
			return message.channel.send(perms.errorO).then(m => {
				client.channels.cache.get(channels.logs).send("<@" + message.author.id + "> tried to use eval!");
				return message.reply("you wish...");
			})
		} else {
			try {
				evalCode = eval(args.join(" "));
				if (typeof evalCode !== "string") {
					evalCode = require("util").inspect(evalCode)
				}
			return message.channel.send(evalCode, { code:"xl", split: true })
			} 
			catch (error) {
				return message.channel.send("Error:\n" + error)
			}
		}
	},
}
