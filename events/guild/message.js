const getDb = require("../../mongodb").getDb;

module.exports = async (client, message) => {
	const db = getDb();
	const settingsColl = db.collection("Settings");

	if (message.author.bot) return;
	
	settingsColl.findOne({ serverID: `${message.guild.id}` })
	.then(res => {
		if (!message.content.startsWith(res.prefix)) return;

		const args = message.content.slice(res.prefix.length).split(/ +/g);
		const commandName = args.shift().toLowerCase();

		const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases
		&& cmd.aliases.includes(commandName)); // Command object

		try {
			command.run(client, message, args);
		}
		catch (error) {
		if (!commandName) message.channel.send("That's not a valid command!");
		console.error(error);
		}
	})	
};