// const { prefix } = require("../../config.json");
const getDb = require("../../mongodb").getDb;


module.exports = async (client, message) => {
	const db = getDb();
	const collection = db.collection(`Settings`);
	collection.findOne({ _id: `${message.guild.name}` })
	.then(res => {
		// console.log(res);
		// console.log(res.prefix.length);
		// console.log(res.prefix);

		if (!message.content.startsWith(res.prefix) || message.author.bot) return;

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