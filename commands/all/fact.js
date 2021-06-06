const Discord = require('discord.js');
const getDb = require('../../mongodb').getDb;
const randomColor = Math.floor(Math.random() * 16777215).toString(16);
const func = require('../../functions.js');

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 472448603642920973 - Valence
 */

module.exports = {
	name: 'fact',
	description: ['Displays a random fact about Valence.', 'Adds a Valence Fact to the DataBase.', 'Removes a specified Fact from the DataBase.', 'Edit the message by providing the Fact number.', 'Shows the entire list of Facts.'],
	aliases: ['f'],
	usage:  ['', 'add <fact>', 'remove <number>', 'edit <number>', 'list'],
	guildSpecific: ['733164313744769024', '668330890790699079', '472448603642920973'],
	run: async (client, message, args, perms, channels) => {
		const db = getDb();
		const vFactsColl = db.collection('Facts');
		const settings = db.collection('Settings');

		await settings.findOne({ _id: message.guild.id })
			.then(async res => {

				const count = await vFactsColl.stats().then(r => r.count);
				const random = Math.floor((Math.random() * count) + 1);
				const fact = args.slice(1).join(' ');
				const code = '```';

				const factEmbed = function(factMessage) {
					const embed = new Discord.MessageEmbed()
						.setTitle('**Daily Valence Fact**')
						.setDescription(factMessage)
						.setColor(`#${randomColor}`)
						.addField('**Sent By:**', '<@&685612946231263232>', true)
						.setTimestamp();
					return embed;
				};

				switch (args[0]) {
				case 'add':
					if (perms.admin) {
						if (!args[1]) {
							console.log('No 2nd argument given.');
							message.channel.send('Give me a message to add to the DataBase.');
						}
						else {
							await vFactsColl.insertOne({ Message: fact,	number: count + 1 });
							message.channel.send(`Fact #${count + 1} has been added to the list!\n${code}${count + 1}. ${fact}${code}`);
							channels.logs.send(`<@${message.author.id}> added a Fact: ${code}#${count + 1}. ${fact}${code}`);
						}
					}
					else {
						message.channel.send(perms.errorA);
					}
					break;
				case 'remove':
					if (perms.admin) {
						if (args[1]) {
							if (func.checkNum(args[1], 1, count)) {
								await vFactsColl.findOne({ number: Number(args[1]) })
									.then(r => {
										vFactsColl.updateMany({ number: { $gt: r.number } }, { $inc: { number: -1 } });
										console.log(`Total facts decreased to: ${count - 1}`);
										message.channel.send(`Fact #${r.number} has been deleted from the list!\n${code}${r.number}. ${r.Message}${code}`);
										channels.logs.send(`<@${message.author.id}> removed a Fact: ${code}#${r.number}. ${r.Message}${code}`);
									});
								vFactsColl.deleteOne({ number: Number(args[1]) });
							}
							else {
								message.channel.send(`Invalid Fact ID! The ID should be between 1 & ${count}.`);
							}
						}
						else {
							console.log('No 2nd argument given - remove.');
							message.channel.send(`You must provide a Fact Number to remove. Use \`${res.prefix}fact list\` to see the number.`);
						}
					}
					else {
						message.channel.send(perms.errorA);
					}
					break;
				case 'edit':
					if (perms.admin) {
						const newMessage = args.slice(2).join(' ');
						if (args[1] && args[2]) {
							await vFactsColl.findOneAndUpdate({ number: Number(args[1]) }, { $set: { Message: newMessage } })
								.then(r => {
									vFactsColl.findOne({ number: r.value.number })
										.then(rs => {
											message.channel.send(`Fact #${rs.number} has been edited successfully!\n${code}${r.value.number}. ${r.value.Message} >>> ${rs.Message}${code}`);
											channels.logs.send(`<@${message.author.id}> edited Fact #${rs.number}: ${code}diff\n- ${r.value.Message}\n+ ${rs.Message}${code}`);
										});
								});
						}
						else if (args[1] === isNaN) {
							console.log(typeof +args[1]);
							console.log(args[1] !== isNaN);
							console.log(+args[1] !== isNaN);
							message.channel.send(`"${args[1]}" is not a valid number!`);
						}
					}
					else {
						message.channel.send(perms.errorA);
					}
					break;
				case 'list':
					if (perms.mod) {
						const list = [];
						await vFactsColl.find({ }).sort({ number: 1 })
							.forEach(x => list.push(`${x.number}. ${x.Message}\n`));
						await message.channel.send(`${list.join('')}`, { split: true, code: '' });
					}
					else {
						message.channel.send(perms.errorM);
					}
					break;
				default:
					if (perms.admin) {
						vFactsColl.findOne({ number: random })
							.then(r => {
								message.delete();
								message.channel.send(factEmbed(r.Message));
								channels.logs.send(`<@${message.author.id}> used the Fact command in <#${message.channel.id}>. https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.channel.lastMessageID} ${code}#${r.number}. ${r.Message}${code}`);
								console.log(`Fact command used by ${message.author.username} : ${r.Message}`);
							});
					}
					else {
						message.channel.send(perms.errorA);
					}
				}
			});
	},
};
