const { prefix } = require("../../config.json");

module.exports = async (client, message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(/ +/g);
	const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases
	&& cmd.aliases.includes(commandName)); // Command object

	if (!commandName) message.channel.send("That's not a valid command!");

	try {
		command.run(client, message, args);
	}
	catch (error) {
		console.error(error);
	}
};