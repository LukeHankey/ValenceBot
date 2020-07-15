module.exports = {
	name: "send",
	description: ["Sends a message to a channel."],
	aliases: [""],
	usage: ["<channel ID> <message content>"],
	run: async (client, message, args) => {
		
	const myID = "212668377586597888";	
    	let content = args.slice(1).join(" ");
 	function checkNum(id = 0, gr_eq = 1, l_eq = Infinity) {
		if (+id !== parseInt(id) || !(id >= gr_eq) || !(id <= l_eq)) {
			return false
		} else {
			return true
		}
	}
		
	if (checkNum(args[0], 1, Infinity)) {
		if (checkNum(args[0], 1, Infinity) && content && message.author.id === myID) { // Has valid ID, & content and is bot owner
			client.channels.cache.get(args[0]).send(content)
		}
		else if (message.guild.channels.cache.has(args[0]) && content) { // Checks if the channel ID is in the same server, and has message content
			message.guild.channels.cache.get(args[0]).send(content);
		}
		else {
			message.channel.send("You can't send a message to a channel in another server!");
		}
	}
	else {
		message.channel.send("You must provide a channel ID");
	}
		
	if (args[0] && !content) {
		message.channel.send("You must provide a message to send");
	}
		// Allow it to only work in the same server unless it's me
		// Search through all channels in server, if not found return
    },
};
