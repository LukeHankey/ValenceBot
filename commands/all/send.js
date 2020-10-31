const func = require("../../functions.js")
const colors = require('../../colors.json')

module.exports = {
	name: "send",
	description: ["Sends a message to a channel."],
	aliases: [""],
	usage: ["<channel ID> <message content>"],
	permissions: [false],
	run: async (client, message, args, perms) => {
		
	const myID = "212668377586597888";	
    let content = args.slice(1).join(" ");
	const code = "```";
	if (!perms.admin) {
		return message.channel.send(func.nEmbed("Permission Denied", "You do not have permission to use this command!", colors.red_dark)
		.addField("Only the following Roles & Users can:", perms.joinA, true)
		.addField(`\u200b`, `<@${message.guild.ownerID}>`, false))
	}
		
		if (func.checkNum(args[0], 1, Infinity)) { // Has valid ID
			if (message.guild.channels.cache.has(args[0]) && content && message.author.id !== myID) { // Has content and channel is in same server
				message.guild.channels.cache.get(args[0]).send(content);
				}
			if (message.author.id === myID && content) {
				client.channels.cache.get(args[0]).send(content);
			}
			else if (message.author.id !== myID && content && !message.guild.channels.cache.has(args[0])) { // Checks for non-owner, message content and if ID is not in same server
				message.channel.send("You are not able to send a message to a channel in another server.");
				client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> tried to send a message to another Server, from Channel: <#${message.channel.id}> to <#${args[0]}>: ${code}Server Name: ${message.guild.name}\nServer ID:${message.guild.id}\nMessage content: ${content}${code}`);
			}
		}
		else { // No valid ID
			message.channel.send("You must provide a channel ID.");
		}
		
		if (args[0] && !content) {
			message.channel.send("You must provide a message to send.");
		}
    },
};
