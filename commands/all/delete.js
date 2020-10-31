module.exports = {
	name: "del",
	description: ["Deletes a number of previous messages in the current channel."],
	aliases: [],
	usage: ["<number>"],
	permissions: [false],
	run: async (client, message, args) => {
		const amount = parseInt(args[0]) + 1; // Deletes itself + at least 1 other message

		if (isNaN(amount)) {
			return message.reply("Please enter a valid number.");
		}
		else
		if (amount <= 1 || amount >= 100) { // bulkDelete is limited between 2 and 100
			return message.reply("You need to input a value between 1 and 99.");
		}
		try {
			message.channel.bulkDelete(amount, true)
		} catch (err) {
			console.error(err);
			message.channel.Xsend("There was an error trying to delete messages in this channel since they are older than 2 weeks!");
		}
	},
};