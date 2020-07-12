const Discord = require("discord.js");
const getDb = require("../../mongodb").getDb;
const randomColor = Math.floor(Math.random() * 16777215).toString(16);

module.exports = {
	name: "fact",
	description: ["Displays a random fact about Valence.", "Adds a Valence Fact to the DataBase."],
	aliases: ["f"],
	usage:  ["", "add <fact>"],
	run: async (client, message, args) => {
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
				if (!args[0]) {
				message.delete();
				message.channel.send(factEmbed(res.Message));
				console.log(`Fact command used by ${message.author.username} : ${res.Message}`);
				}
			});

			if ((args[0] === "add") && !args[1]) {
				console.log("No 2nd argument given.");
				message.channel.send("Give me a message to add to the DataBase.");
			}

			const fact = args[1];
			console.log(fact);
	},
};