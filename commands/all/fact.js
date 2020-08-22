const Discord = require("discord.js");
const getDb = require("../../mongodb").getDb;
const randomColor = Math.floor(Math.random() * 16777215).toString(16);
const func = require("../../functions.js")

module.exports = {
	name: "fact",
	description: ["Displays a random fact about Valence.", "Adds a Valence Fact to the DataBase.", "Removes a specified Fact from the DataBase.", "Edit the message by providing the Fact number." ,"Shows the entire list of Facts."],
	aliases: ["f"],
	usage:  ["", "add <fact>", "remove <number>", "edit <number>", "list"],
	run: async (client, message, args) => {
		const db = getDb();
		const vFactsColl = db.collection("Facts");
		const settings = db.collection("Settings")
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

		settings.find({}).toArray().then(o => console.log(o))

		await settings.findOne({ _id: message.guild.name })
		.then(async res => {
			switch (args[0]) {
				case "add":
					if (!args[1]) {
						console.log("No 2nd argument given.");
						message.channel.send("Give me a message to add to the DataBase.");
					} else {
						await vFactsColl.insertOne({ Message: fact,	number: count+1, })
						message.channel.send(`Fact #${count+1} has been added to the list!\n${code}${count+1}. ${fact}${code}`);
						client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> added a Fact: ${code}#${count+1}. ${fact}${code}`);
					}
				break;
				case "remove":
					if (args[1]) {
						if (func.checkNum(args[1], 1, count)) { 
							await vFactsColl.findOne({ number: Number(args[1]) })
							.then(r => {
								vFactsColl.updateMany({ number: { $gt: r.number }}, { $inc: { number: -1 }});
								console.log(`Total facts decreased to: ${count-1}`);
								message.channel.send(`Fact #${r.number} has been deleted from the list!\n${code}${r.number}. ${r.Message}${code}`);
								client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> removed a Fact: ${code}#${r.number}. ${r.Message}${code}`);
							});
						vFactsColl.deleteOne({ number: Number(args[1]) });
						} else {
						message.channel.send(`Invalid Fact ID! The ID should be between 1 & ${count}.`);
						}
					} else {
						console.log("No 2nd argument given - remove.");
						message.channel.send(`You must provide a Fact Number to remove. Use \`${res.prefix}fact list\` to see the number.`);
					}
				break;
				case "edit":
				const newMessage = args.slice(2).join(" ");
					if (args[1] && args[2]) {
						await vFactsColl.findOneAndUpdate({ number: Number(args[1]) }, { $set: { Message: newMessage }})
						.then(r => {
							vFactsColl.findOne({ number: r.value.number })
							.then(rs => {
								message.channel.send(`Fact #${rs.number} has been edited successfully!\n${code}${r.value.number}. ${r.value.Message} >>> ${rs.Message}${code}`);
								client.channels.cache.get("731997087721586698")
								.send(`<@${message.author.id}> edited Fact #${rs.number}: ${code}diff\n- ${r.value.Message}\n+ ${rs.Message}${code}`);
							})
						})
					} else if (args[1] === isNaN) {
						console.log(typeof +args[1])
						console.log(args[1] !== isNaN)
						console.log(+args[1] !== isNaN)
						message.channel.send(`"${args[1]}" is not a valid number!`)
					}
				break;
				case "list":
					const list = [];
					await vFactsColl.find({ }).sort({ number: 1})
					.forEach(x => list.push(`${x.number}. ${x.Message}\n`));
					await message.channel.send(`${list.join("")}`, { split: true, code: `` });
				break;
				default:
				vFactsColl.findOne({ number: random }) // Fact
				.then(r => {
						message.delete();
						message.channel.send(factEmbed(r.Message));
						client.channels.cache.get("731997087721586698").send(`<@${message.author.id}> used the Fact command in <#${message.channel.id}>. https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.channel.lastMessageID} ${code}#${r.number}. ${r.Message}${code}`);
						console.log(`Fact command used by ${message.author.username} : ${r.Message}`);
				});
			}
		});
	},
};
