/* eslint-disable no-shadow */
/* eslint-disable no-useless-escape */
const func = require('../../functions');
const colors = require('../../colors.json');
const getDb = require('../../mongodb').getDb;
const { ScouterCheck, Paginate } = require('../../classes.js');

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 420803245758480405 - DSF
 */

module.exports = {
	name: 'dsf',
	description: ['Displays all of the current stored messages.', 'Clears all of the current stored messages.', 'Shows the list of potential scouters/verified scouters with the set scout count, or count adjusted.', 'Add 1 or <num> merch count to the member provided.', 'Remove 1 or <num> merch count to the member provided.'],
	aliases: [],
	usage: ['messages view', 'messages clear', 'view scouter/verified <num (optional)>', 'user memberID/@member add <num (optional)> <other>', 'user memberID/@member remove <num (optional)> <other>'],
	guildSpecific: ['733164313744769024', '420803245758480405'],
	run: async (client, message, args, perms) => {
		if (!perms.admin) return message.channel.send(perms.errorA);
		const db = getDb();
		const settings = db.collection('Settings');

		switch (args[0]) {
		case 'm':
		case 'messages':
			switch (args[1]) {
			default: {
				await settings.findOne({ _id: message.guild.id }).then(async res => {
					const fields = [];
					const data = await res.merchChannel.messages;
					const embed = func.nEmbed('List of messages currently stored in the DB',
						'There shouldn\'t be too many as they get automatically deleted after 10 minutes. If the bot errors out, please clear all of them using \`;dsf messages clear\`.',
						colors.cream,
						message.member.user.displayAvatarURL(),
						client.user.displayAvatarURL());

					for (const values of data) {
						let date = new Date(values.time);
						date = date.toString().split(' ');
						fields.push({ name: `${values.author}`, value: `**Time:** ${date.slice(0, 5).join(' ')}\n**Content:** [${values.content}](https://discordapp.com/channels/${message.guild.id}/${res.merchChannel.channelID}/${values.messageID} 'Click me to go to the message.')`, inline: false });
					}
					return message.channel.send(embed.addFields(fields));
				});
			}
				break;
			case 'clear':
				await settings.findOneAndUpdate({ _id: message.guild.id },
					{
						$pull: {
							'merchChannel.messages': { time: { $gt: 0 } },
						},
					},
				);
				message.react('✅');
			}

			break;
		case 'reacts': {
			switch (args[1]) {
			case 'clear': {
				const database = await settings.findOne({ _id: message.guild.id });
				const pagination = new Paginate(message, database, null);
				pagination.membersBelowThreshold.map(async mem => {
					const channelID = database.merchChannel.channelID;
					const channel = client.channels.cache.get(channelID);
					channel.messages.fetch(mem.msg).then(m => {
						return m.reactions.removeAll().then(m => m.react('☠️'));
					});
					// null if the message has no users that reacted to the post
					if (mem.member.id !== null) {
						await settings.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': mem.msg }, {
							$pull: {
								'merchChannel.spamProtection.$.users': { id: mem.member.id },
							},
						});
					}
					await settings.findOne({ _id: message.guild.id })
						.then(updated => {
							const db = updated.merchChannel.spamProtection;
							db.map(async obj => {
								// Go through each message and match that to the message where there are members who are below the threshold
								if (obj.messageID === mem.msg) {
									// If not null from above, remove the message
									if (!obj.users.length) {
										await settings.updateOne({ _id: message.guild.id }, {
											$pull: {
												'merchChannel.spamProtection': { messageID: obj.messageID },
											},
										});
									}
									else {return;}
								}
							});
						});

				});
				message.react('✅');
			}
				break;
			default: {
				await settings.findOne({ _id: message.guild.id }).then(async res => {
					let page = 0;
					const fields = [];
					const spamData = await res.merchChannel.spamProtection;

					for (const values of spamData) {
						let date = new Date(values.time);
						date = date.toString().split(' ');
						fields.push({ name: `${values.author}`, value: `**Time:** ${date.slice(0, 5).join(' ')}\n**Content:** [${values.content}](https://discordapp.com/channels/${message.guild.id}/${res.merchChannel.channelID}/${values.messageID} 'Click me to go to the message.')`, inline: false });
					}
					const paginate = (dataFields) => {
						const pageEmbeds = [];
						const data = dataFields;
						let k = 12;
						for (let i = 0; i < data.length; i += 12) {
							const current = data.slice(i, k);
							k += 12;
							const info = current;
							const embed = func.nEmbed('List of reaction messages currently stored in the DB that have had reactions added too',
								'There may be quite a few and if there are, clear them out using \`;dsf reacts clear\`.',
								colors.cream,
								message.member.user.displayAvatarURL(),
								client.user.displayAvatarURL());
							embed.setTimestamp().addFields(info);
							pageEmbeds.push(embed);
						}
						return pageEmbeds;
					};
					const embeds = paginate(fields);

					return message.channel.send(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`))
						.then(async msg => {
							await msg.react('◀️');
							await msg.react('▶️');

							const react = (reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === message.author.id;
							const collect = msg.createReactionCollector(react);

							collect.on('collect', (r, u) => {
								if (r.emoji.name === '▶️') {
									if (page < embeds.length) {
										msg.reactions.resolve('▶️').users.remove(u.id);
										page++;
										if (page === embeds.length) --page;
										msg.edit(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`));
									}
								}
								else if (r.emoji.name === '◀️') {
									if (page !== 0) {
										msg.reactions.resolve('◀️').users.remove(u.id);
										--page;
										msg.edit(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`));
									}
									else {msg.reactions.resolve('◀️').users.remove(u.id);}
								}
							});
						});
				});
			}
			}
		}
			break;
		case 'view': {
			let scout = new ScouterCheck('Scouter');
			let vScout = new ScouterCheck('Verified Scouter');

			// eslint-disable-next-line no-shadow
			const classVars = async (name, serverName, db) => {
				name._client = client;
				name._guild_name = serverName;
				name._db = await db.map(doc => {
					if (doc.serverName === name._guild_name) return doc;
				}).filter(x => x)[0];
				return name._client && name._guild_name && name._db;
			};
			const res = await settings.find({}).toArray();
			await classVars(vScout, message.guild.name, res);
			await classVars(scout, message.guild.name, res);
			const num = args[2];

			switch (args[1]) {
			case 'scouter':
				if (num) {
					scout = new ScouterCheck('Scouter', parseInt(num));
					await classVars(scout, message.guild.name, res);
					scout.send(message.channel.id);
				}
				else {
					const scoutCheck = await scout._checkForScouts();
					if (!scoutCheck.length) {
						message.channel.send('None found.');
					}
					else {return scout.send(message.channel.id);}
				}
				break;
			case 'verified':
				if (num) {
					vScout = new ScouterCheck('Verified Scouter', parseInt(num));
					await classVars(vScout, message.guild.name, res);
					vScout.send(message.channel.id);
				}
				else {
					const verifiedCheck = await vScout._checkForScouts();
					if (!verifiedCheck.length) {
						message.channel.send('None found.');
					}
					else {return vScout.send(message.channel.id);}
				}
			}
			break;
		}
		case 'user': {
			// eslint-disable-next-line prefer-const
			let [userID, param, num] = args.slice(1);
			const cacheCheck = async (user) => {
				if (!message.guild.members.cache.has(user)) {
					return await message.guild.members.fetch(user)
						.then(() => true)
						.catch(() => false);
				}
				else {
					return true;
				}
			};
			const checkMem = cacheCheck(userID);
			const reaction = await checkMem;
			// eslint-disable-next-line no-self-assign
			func.checkNum(userID) && checkMem ? userID = userID : userID = undefined;
			const userMention = message.mentions.members.first()?.user.id ?? userID;

			if (userMention === undefined) return message.channel.send('Please provide a valid member ID or member mention.');
			switch (param) {
			case 'add':
				if (!num) {
					await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.count': 1,
						},
					});
					if (reaction) return message.react('✅');
					else return message.react('❌');
				}
				else if (num === 'other') {
					await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.otherCount': 1,
						},
					});
					if (reaction) return message.react('✅');
					else return message.react('❌');
				}
				else {
					if (isNaN(parseInt(num))) {
						return message.channel.send(`\`${num}\` is not a number.`);
					}
					else {num = +num;}
					const other = args.slice(4);
					if (other[0] === 'other') {
						await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
							$inc: {
								'merchChannel.scoutTracker.$.otherCount': +num,
							},
						});
						if (reaction) return message.react('✅');
						else return message.react('❌');
					}
					else {
						await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
							$inc: {
								'merchChannel.scoutTracker.$.count': +num,
							},
						});
						if (reaction) return message.react('✅');
						else return message.react('❌');
					}
				}
			case 'remove':
				if (!num) {
					await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.count': -1,
						},
					});
					if (reaction) return message.react('✅');
					else return message.react('❌');
				}
				else if (num === 'other') {
					await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
						$inc: {
							'merchChannel.scoutTracker.$.otherCount': -1,
						},
					});
					if (reaction) return message.react('✅');
					else return message.react('❌');
				}
				else {
					if (isNaN(parseInt(num))) {
						return message.channel.send(`\`${num}\` is not a number.`);
					}
					else {num = +num;}
					const other = args.slice(4);
					if (other[0] === 'other') {
						await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
							$inc: {
								'merchChannel.scoutTracker.$.otherCount': -num,
							},
						});
						if (reaction) return message.react('✅');
						else return message.react('❌');
					}
					else {
						await settings.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': userMention }, {
							$inc: {
								'merchChannel.scoutTracker.$.count': -num,
							},
						});
						if (reaction) return message.react('✅');
						else return message.react('❌');
					}
				}
			default:
				return message.channel.send('Valid params are `add` or `remove`.');
			}
		}
		default:
			return message.channel.send(func.nEmbed(
				'**DSF Admin Commands List**',
				'Here\'s a list of all the DSF commands you can use. Any parameter(s) in \`<>\` are optional:\n\n\`messages|m view\`\n\`messages|m clear\`\n\`view scouter <num>\`\n\`view verified <num>\`\n\`user memberID/@member add <other> <num>\`\n\`user memberID/@member remove <other> <num>\`',
				colors.cyan,
				client.user.displayAvatarURL(),
			));
		}
	},
};
