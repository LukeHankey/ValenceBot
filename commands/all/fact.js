const Discord = require("discord.js");
const getDb = require("../../mongodb").getDb;
const randomColor = Math.floor(Math.random() * 16777215).toString(16);

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
		const factEmbed = function(factMessage) {
			const embed = new Discord.MessageEmbed()
				.setTitle("**Daily Valence Fact**")
				.setDescription(factMessage)
				.setColor(`#${randomColor}`)
				.addField("**Sent By:**", "<@&685612946231263232>", true)
				.setTimestamp();
			return embed;
		};

		vFactsColl.findOne({ number: random })
			.then(res => {
				message.delete();
				message.channel.send(factEmbed(res.Message));
				console.log(`Fact command used by ${message.author.username} : ${res.Message}`);
				console.log("Test");
			});

	},
};