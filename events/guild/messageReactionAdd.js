/* eslint-disable no-shadow */
const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const { removeMessage, removeEvents } = require('../../functions');
const colors = require('../../colors.json');
const fetch = require('node-fetch');

module.exports = async (client, reaction, user) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const message = reaction.message;

	if (process.env.NODE_ENV === 'DEV') {
		if (message.guild.id !== '668330890790699079') return;
	}
	else if (message.guild.id === '668330890790699079') {return;}
	const { _id } = await settingsColl.findOne({ _id: message.channel.guild.id });
	const { channels: { errors, logs } } = await settingsColl.findOne({ _id: 'Globals' }, { projection: { channels: { errors: 1, logs: 1 } } });
	const channels = {
		errors: {
			id: errors,
			embed: function(err, module) {
				const fileName = module.id.split('\\').pop();
				const embed = new MessageEmbed()
					.setTitle(`An error occured in ${fileName}`)
					.setColor(colors.red_dark)
					.addField(`${err.message}`, `\`\`\`${err.stack}\`\`\``);
				return embed;
			},
			send: function(...args) {
				const channel = client.channels.cache.get(this.id);
				return channel.send({ embeds: [ this.embed(...args) ] });
			},
		},
		logs: {
			id: logs,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send({ content });
			},
		},
	};
	if (message.partial) await message.fetch().catch(err => channels.errors.send(err, module));
	switch (message.channel.guild.id) {
	case _id:
		// Valence
		if (_id === '472448603642920973') {
			if (user.bot) return;
			const usersDB = db.collection('Users');
			const data = await settingsColl.findOne({ _id: message.channel.guild.id }, { projection: { events: 1, channels: 1, calendarID: 1 } });
			const { nameChange } = await settingsColl.findOne({ _id: message.channel.guild.id }, { projection: { nameChange: 1, _id: 0 } });

			if (message.channel.id === data.channels.events) {
				const messageMatch = data.events.filter(m => m.messageID === message.id);

				if (!messageMatch.length) return;
				if (reaction.emoji.name === '✅') {
					if (user.id !== message.author.id) {
						message.reactions.resolve('✅').users.remove(user.id);
						return;
					}

					await removeEvents(client, message, settingsColl, { channels, module: module }, data, 'messageID', message.id);
				}
				else if (reaction.emoji.name === '📌') {
					const userFetch = await message.channel.guild.members.fetch(user.id);
					const eventFound = data.events.find(e => e.messageID === message.id);
					userFetch.roles.add(eventFound.roleID);
					await settingsColl.findOneAndUpdate({ _id: message.channel.guild.id, 'events.messageID': eventFound.messageID }, { $addToSet: { 'events.$.members': user.id } });
				}
			}
			else if (message.channel.id === data.channels.adminChannel) {
				const messageMatch = nameChange.find(o => o.messageID === message.id);
				if (messageMatch) {
					let primary = message.content.split('\n')[3];
					const potentialNewNamesList = [];
					messageMatch.data[0].potentialNewNames.forEach(item => potentialNewNamesList.push(item.clanMate.toLowerCase()));
					const potentialPreviousName = messageMatch.data[0].clanMate;
					let oldData = messageMatch.data.map(o => { return { _id: o._id, clanMate: o.clanMate, clanRank: o.clanRank, totalXP: o.totalXP, kills: o.kills, discord: o.discord, discActive: o.discActive, alt: o.alt, gameActive: o.gameActive }; });
					if (reaction.emoji.name === '✅') {
						primary = primary.split(' |')[0];
						const oldProfile = await usersDB.findOne({ clanMate: potentialPreviousName });
						await usersDB.deleteOne({ clanMate: potentialPreviousName });
						await usersDB.updateOne({ clanMate: primary }, {
							$set: {
								discord: oldProfile.discord,
								discActive: oldProfile.discActive,
								alt: oldProfile.alt,
								gameActive: oldProfile.gameActive,
							},
							$unset: {
								potentialNewNames: 1,
							},
						});
						settingsColl.updateOne({ _id: message.channel.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } });
						return message.reactions.removeAll();
					}
					else if (reaction.emoji.name === '❌') {
						let metricsProfile = await fetch(`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${potentialPreviousName}%22%5D&callback=jQuery000000000000000_0000000000&_=0`).then(response => response.text());
						metricsProfile = JSON.parse(metricsProfile.slice(34, -4));
						const userLeft = await usersDB.findOne({ $text: { $search: potentialPreviousName, $caseSensitive: false } }, { projection: { _id: 0, potentialNewNames: 0, profile: 0 } });

						if (metricsProfile.clan && metricsProfile.clan !== 'Valence') {
							const embed = new MessageEmbed()
								.setTitle(`${userLeft.clanMate} is no longer in Valence`)
								.setDescription(`${user.username} chose ❌ on name changes. (Not changed names or none match). User has been removed from the database.`)
								.setColor(colors.red_dark)
								.addField('Users old profile', `\`\`\`${JSON.stringify(userLeft)}\`\`\``);
							const channel = client.channels.cache.get(channels.errors.id);
							channel.send(embed);
							await usersDB.deleteOne({ clanMate: userLeft.clanMate });
						}
						else {
							// Checks if the potential previous name is equal to the current name.
							let metricsProfile = await fetch(`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${potentialPreviousName}%22%5D&callback=jQuery000000000000000_0000000000&_=0`).then(response => response.text());
							metricsProfile = JSON.parse(metricsProfile.slice(34, -4));
							const userLeft = await usersDB.findOne({ $text: { $search: potentialPreviousName, $caseSensitive: false } }, { projection: { _id: 0, potentialNewNames: 0, profile: 0 } });

							if (metricsProfile.clan && metricsProfile.clan !== 'Valence') {
								const embed = new MessageEmbed()
									.setTitle(`${userLeft.clanMate} is no longer in Valence`)
									.setDescription(`${user.username} chose ❌ on name changes. (Not changed names or none match). User has been removed from the database.`)
									.setColor(colors.red_dark)
									.addField('Users old profile', `\`\`\`${JSON.stringify(userLeft)}\`\`\``);
								const channel = client.channels.cache.get(channels.errors.id);
								channel.send(embed);
								await usersDB.deleteOne({ clanMate: userLeft.clanMate });
							}
							else {
								// Checks if the potential previous name is equal to the current name.
								// eslint-disable-next-line no-lonely-if
								if (userLeft.clanMate === potentialPreviousName) {
									oldData = oldData.find(u => u.clanMate.toLowerCase() === potentialPreviousName.toLowerCase());
									await usersDB.deleteOne({ clanMate: potentialPreviousName });
									await usersDB.insertOne(oldData);
								}
							}
							settingsColl.updateOne({ _id: message.channel.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } });
							return message.reactions.removeAll();
						}
					}
					else if (reaction.emoji.name === '📝') {
						try {
							message.channel.send('Please type out one of the above suggested names.');
							const filter = m => potentialNewNamesList.includes(m.content.toLowerCase());
							let msg = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
							msg = msg.first();
							const found = messageMatch.data[0].potentialNewNames.find(u => u.clanMate.toLowerCase() === msg.content.toLowerCase());

							const details = (currentName, previousName) => {
								const result = {};
								if (currentName.discActive || previousName.discActive) {
									result.discActive = true;
									currentName.discActive ? result.discord = currentName.discord : result.discord = previousName.discord;
								}
								currentName.alt || previousName.alt ? result.alt = true : result.alt = false;
								currentName.gameActive || previousName.gameActive ? result.gameActive = true : result.gameActive = false;
								return result;
							};

							const info = details(found, messageMatch.data[0]);
							usersDB.updateOne({ clanMate: found[0].clanMate }, {
								$set: {
									discord: info.discord,
									discActive: info.discActive,
									alt: info.alt,
									gameActive: info.gameActive,
								},
							});
							usersDB.deleteOne({ clanMate: potentialPreviousName });
							settingsColl.updateOne({ _id: message.channel.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } });
							return message.reactions.removeAll();
						}
						catch (err) {
							if (err) return message.channel.send({ content: 'Timed out. Try again.' });
							channels.errors.send(err, module);
						}
					}
					else { return; }
				}
			}
		}
		// DSF
		else if (_id === '420803245758480405') {
			const { merchChannel: {
				channelID,
				spamProtection,
				deletions,
			} } = await settingsColl.findOne({ _id: message.channel.guild.id },
				{ projection: {
					'merchChannel.channelID': 1,
					'merchChannel.spamProtection': 1,
					'merchChannel.blocked': 1,
					'merchChannel.deletions': 1,
				},
				});

			switch (message.channel.id) {
			case channelID: {
				if (user.bot) return;

				const merchChannelID = client.channels.cache.get(channelID);
				spamProtection.forEach(async (msgObj) => {
					try {
						const m = await merchChannelID.messages.fetch(msgObj.messageID);

						// Remove all reactions if there is > 1 or 0. Then add a skull.
						if (Date.now() - m.createdTimestamp >= 3600000 && (m.reactions.cache.size > 1 || m.reactions.cache.size === 0)) {
							await m.reactions.removeAll();
							await removeMessage(message, m, settingsColl);
							return await m.react('☠️');
						}
						// If there is only a skull, remove users and message from DB
						else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && m.reactions.cache.has('☠️')) {
							await removeMessage(message, m, settingsColl);
							await m.reactions.removeAll();
							return await m.react('☠️');
						}
						// If there is a single reaction which is not the Skull, then remove that and react with skull. Repeat process over.
						else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && !m.reactions.cache.has('☠️')) {
							await m.reactions.removeAll();
							await removeMessage(message, m, settingsColl);
							return await m.react('☠️');
						}
						else {return;}
					}
					catch (e) {
						if (e.code === 10008) {
							const messageID = e.path.split('/')[4];
							return await settingsColl.updateOne({ _id: message.channel.guild.id }, {
								$pull: {
									'merchChannel.spamProtection': { messageID: messageID },
								},
							});
						}
						else { return channels.errors.send(e, module); }
					}
				});
			}
				break;
			case deletions.channelID: {
				console.log(2, reaction);
				if (reaction.me) return;
				console.log(3);
				if (reaction.emoji.name !== '✅') return;
				const item = deletions.messages.find(item => item.messageID === message.id);
				console.log(item);
				if (item) {
					await settingsColl.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': item.authorID }, {
						$inc: {
							'merchChannel.scoutTracker.$.count': -1,
						},
					});
					await settingsColl.updateOne({ _id: message.channel.guild.id }, {
						$pull: {
							'merchChannel.deletions.messages': { messageID: item.messageID },
						},
					});
					const dsfServerWebhook = await client.channels.cache.get('794608385106509824').fetchWebhooks();
					const channelToSend = dsfServerWebhook.first();
					const newEmbed = new MessageEmbed(message.embeds[0]);
					newEmbed.setColor(colors.green_light).setTitle('Message Deleted - Count Removed');
					message.delete();
					return await channelToSend.send({ embeds: [ newEmbed ] });
				}
			}
			}
		}
		else { return; }
	}
};