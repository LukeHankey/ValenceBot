module.exports = {
	name: "eval",
	description: ["Evaluates code."],
	aliases: [""],
	usage:  ["<code>"],
	run: async (client, message, args) => {

		if (message.author.id !== "212668377586597888") {
			client.channels.cache.get("731997087721586698").send("<@" + message.author.id + "> tried to use eval!");
			return message.reply("you wish...");
			} 
		else {
			try {
				evalCode = eval(args.join(" "));
				if (typeof evalCode !== "string") {
					evalCode = require("util").inspect(evalCode)
				}
			return message.channel.send(evalCode, {code:"xl"})
			} 
			catch (error) {
				return message.channel.send("Error:\n" + error)
			}
		}
	},
}
