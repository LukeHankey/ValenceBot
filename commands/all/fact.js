const Discord = require("discord.js");
const { prefix } = require("../../config.json");
const getDb = require("../../mongodb").getDb;
const randomColor = Math.floor(Math.random() * 16777215).toString(16);

module.exports = {
	name: "fact",
	description: ["Displays a random fact about Valence.", "Adds a Valence Fact to the DataBase.", "Removes a specified Fact from the DataBase.", "Shows the entire list of Facts."],
	aliases: ["f"],
	usage:  ["", "add <fact>", "remove <number>", "list"],
	run: async (client, message, args) => {
		const db = getDb();
		const vFactsColl = db.collection("Facts");

		const count = await vFactsColl.stats()
			.then(res => {
				return res.count;
			});

		const random = Math.floor((Math.random() * count) + 1);
		const fact = args.slice(1).join(" ");
		const code = "```";
			
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
			else if ((args[0] === "remove") && !args[1]) {
				console.log("No 2nd argument given - remove.");
				message.channel.send(`You must provide a Fact Number to remove. Use \`${prefix}fact list\` to see the number.`);
			}

			if (fact && (args[0] === "add")) {
				await vFactsColl.insertOne({ Message: fact,	number: count+1, })
					message.delete();
					message.channel.send(`${code}${count+1}. ${fact}${code} Fact #${count+1} has been added to the list!`);
					client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> added a Fact: ${code}#${count+1}. ${fact}${code}`);
				}

			if (fact && (args[0] === "remove")) {
				await vFactsColl.findOne({ number: Number(fact) })
				.then(res => {
					if (res.number < count) {
						vFactsColl.updateMany({ number: { $gt: res.number }}, { $inc: { number: -1 }})
						console.log(`Total facts decreased to: ${count-1}`);
					}
					message.channel.send(`${code}${res.number}. ${res.Message}${code} Fact #${count} has been deleted from the list!`);
					client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> removed a Fact: ${code}#${res.number}. ${res.Message}${code}`);
					});
				vFactsColl.deleteOne({ number: Number(fact) })
			}				

			if (args[0] === "list") {
				// const listEmbed = function(fNum, fMessage) {
				// 	const embed = new Discord.MessageEmbed()
				// 		.setTitle("**Daily Valence Facts**")
				// 		.setColor(`#${randomColor}`)
				// 		.addField(fNum, fMessage)
				// 		.setTimestamp();
				// 	return embed;
				// };
				// await vFactsColl.find({ number: { $gte: 1 } })
				// .forEach(f => message.channel.send(listEmbed(`${f.number}.`, `${f.Message}`)));

				const list = [];
				await vFactsColl.find({ })
				.forEach(x => list.push(`${x.number}. ${x.Message}\n`));
				// console.log(list.join(" "));
				await message.channel.send(`${code}${list.slice(0, 10).join("")}${code}`);
				await message.channel.send(`${code}${list.slice(10, 20).join("")}${code}`);
				if (count > 20) {
				await message.channel.send(`${code}${list.slice(20, 30).join("")}${code}`);
				}
				// Or push number + message to array and add fields to an embed
				// Can use reactions to move to the next page
			}
	},
};