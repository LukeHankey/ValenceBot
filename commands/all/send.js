module.exports = {
	name: "send",
	description: ["Sends a message to a channel."],
	aliases: [""],
	usage: ["<channel ID> <message content>"],
	run: async (client, message, args) => {
  function checkNum(id = 0, gr_eq = 1, l_eq = Infinity) {
			if (+id !== parseInt(id) || !(id >= gr_eq) || !(id <= l_eq)) {
				return false
			} else {
				return true
			}
		}
    
    if (!checkNum(args[0], 1, Infinity)) {
      message.channel.send("Invalid message ID")
    }
    
    let content = args.slice(1).join(" ");
    console.log(content);
		
    if (args[0] && content) {
      client.channels.cache.get(args[0]).send(content);
    }
  
  
    },
};
