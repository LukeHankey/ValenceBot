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

			/* PERMISSIONS *\
			* COMMAND FILES
			* Add permissions: ["modRole", "adminRole"] to all commands
			* Use module.exports.permissions[x] to access the array
			* Array methods to find specific permission
			* 
			* MESSAGE/OTHER FILE
			* Define each set of permissions in this file or with reference to another file
			* Objects or Classes as the structure or another export
			*/

		try {
			command.run(client, message, args);
		}
		catch (error) {
			if (commandName !== command) message.channel.send("That's not a valid command!");
			console.error(error);
		}
	})	
};