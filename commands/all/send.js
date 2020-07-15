module.exports = {
	name: "send",
	description: ["Sends a message to a channel."],
	aliases: [""],
	usage: ["<channel ID> <message content>"],
	run: async (client, message, args) => {
	const myID = 212668377586597888;	
    	let content = args.slice(1).join(" ");
 	function checkNum(id = 0, gr_eq = 1, l_eq = Infinity) {
		if (+id !== parseInt(id) || !(id >= gr_eq) || !(id <= l_eq)) {
			return false
		} else {
			return true
		}
	}
		console.log(message.author.id)
		console.log(myID)
	if (message.author.id === myID && (checkNum(args[0], 1, Infinity))) {
		message.channel.send("You forgot to include your message content.")
	}
	else if (checkNum(args[0], 1, Infinity) && message.guild.channels.cache.has(args[0])) {
		 message.channel.send("Provide a message to send.");
	}
	else {
		message.channel.send("You must provide a channel ID");
	}

    if (args[0] && content) {
      client.channels.cache.get(args[0]).send(content);
    }
  
		// Allow it to only work in the same server unless it's me
		// Search through all channels in server, if not found return
  
    },
};
