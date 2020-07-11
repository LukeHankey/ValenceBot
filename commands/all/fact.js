const getDb = require("../../mongodb").getDb;

module.exports = {
	name: "fact",
	description: ["Displays a random fact about Valence."],
	aliases: ["f"],
	usage:  [""],
	run: async (client, message) => {
		const db = getDb();
		const vFactsColl = db.collection("Facts");
		const count = await vFactsColl.stats()
			.then(res => {
				return res.count;
			});
		const random = Math.floor((Math.random() * count) + 1);

		vFactsColl.findOne({ number: random })
			.then(res => {
				message.delete();
				message.channel.send(res.Message);
			});

	},
};