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

	// if (process.env.NODE_ENV === 'DEV') {
	// 	if (message.guild.id !== '733164313744769024') return;
	// }
	// else if (message.guild.id === '733164313744769024') {return;}

	const { _id } = await settingsColl.findOne({ _id: message.guild.id });
	const { channels: { errors, logs } } = await settingsColl.findOne({ _id: 'Globals' }, { projection: { channels: { errors: 1, logs: 1 } } });
	const channels = {
		errors: {
			id: errors,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				content = `<@!212668377586597888>\n\n${content}`;
				return channel.send(content);
			},
		},
		logs: {
			id: logs,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send(content);
			},
		},
	};
	if (message.partial) await message.fetch().catch(err => channels.errors.send('Unknwon error in messageReactionAdd.js', err));

	switch (message.guild.id) {
	case _id:
		// Valence
		if (_id === '472448603642920973' || _id === '733164313744769024') {
			const data = await settingsColl.findOne({ _id: message.guild.id }, { projection: { events: 1, channels: 1, calendarID: 1 } });
			const messageMatch = data.events.filter(m => m.messageID === message.id);

			if (!messageMatch.length || user.bot) return;
			if (reaction.emoji.name === '✅') {
				if (user.id !== message.author.id) {
					message.reactions.resolve('✅').users.remove(user.id);
					return;
				}

				await removeEvents(client, message, settingsColl, channels, data, 'messageID', message.id);
			}
			else if (reaction.emoji.name === '📌') {
				const userFetch = await message.guild.members.fetch(user.id);
				const eventFound = data.events.find(e => e.messageID === message.id);
				userFetch.roles.add(eventFound.roleID);
				await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'events.messageID': eventFound.messageID }, { $addToSet: { 'events.$.members': user.id } });
			}
		}
		// DSF & Test servers
		else if (_id === '420803245758480405' || _id === '733164313744769024') {
			const { merchChannel: {
				channelID,
				spamProtection,
				deletions,
			} } = await settingsColl.findOne({ _id: message.guild.id },
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
				// Logging reaction timestamps
				// console.log('Reaction added:', `MessageID: ${message.id}`, `By: ${user.username} (${user.id})`, `Reaction: ${reaction.emoji.toString() || reaction.reactionEmoji.toString()} | ${reaction.emoji.name || reaction.reactionEmoji.name} `, `${new Date(Date.now()).toString().split(' ').slice(0, -4).join(' ')} ${(new Date(Date.now()).getMilliseconds())}`);

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
							return await settingsColl.updateOne({ _id: message.guild.id }, {
								$pull: {
									'merchChannel.spamProtection': { messageID: messageID },
								},
							});
						}
						else { return channels.errors.send('Unknown error in messageReactionAdd.js', e); }
					}
				});
			}
				break;
			case deletions.channelID: {
				if (reaction.me) return;
				const item = deletions.messages.find(item => item.messageID === message.id);
				const dsfServerWebhook = await client.channels.cache.get('794608385106509824').fetchWebhooks();
				const channelToSend = dsfServerWebhook.first();
				if (reaction.emoji.name !== '✅') return;
				if (item) {
					await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': item.authorID }, {
						$inc: {
							'merchChannel.scoutTracker.$.count': -1,
						},
					});
					await settingsColl.updateOne({ _id: message.guild.id }, {
						$pull: {
							'merchChannel.deletions.messages': { messageID: item.messageID },
						},
					});
					const newEmbed = new MessageEmbed(message.embeds[0]);
					newEmbed.setColor(colors.green_light).setTitle('Message Deleted - Count Removed');
					message.delete();
					return await channelToSend.send(newEmbed);
				}
			}
			}
		}
		else if (_id === '668330890790699079') {
			if (user.bot) return;
			const usersDB = db.collection('Users');
			const { nameChange } = await settingsColl.findOne({ _id: message.guild.id }, { projection: { nameChange: 1, _id: 0 } });
			const messageMatch = nameChange.find(o => o.messageID === message.id);

			if (messageMatch) {
				let primary = message.content.split('\n')[3];
				const allNames = [];
				messageMatch.data.forEach(item => allNames.push(item.clanMate.toLowerCase()));
				let oldData = messageMatch.data.map(o => { return { _id: o._id, clanMate: o.clanMate, clanRank: o.clanRank, totalXP: o.totalXP, kills: o.kills, discord: o.discord, discActive: o.discActive, alt: o.alt, gameActive: o.gameActive }; });

				if (reaction.emoji.name === '✅') {
					primary = primary.split(' |')[0];
					const found = messageMatch.data.find(u => u.clanMate === primary);
					usersDB.updateOne({ clanMate: found.potentialNewNames[0].clanMate }, {
						$set: {
							discord: found.discord,
							discActive: found.discActive,
							alt: found.alt,
							gameActive: found.gameActive,
						},
					});
					allNames.forEach(async u => {
						const user = await usersDB.findOne({ $text: { $search: u, $caseSensitive: false } });
						usersDB.deleteOne({ clanMate: user.clanMate });
						if (u === primary.toLowerCase()) return;
						await usersDB.insertOne(oldData);
					});
					settingsColl.updateOne({ _id: message.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } });
					return message.reactions.removeAll();
				}
				else if (reaction.emoji.name === '❌') {
					let index = 0;
					const interval = setInterval(async () => {
						try {
							let metricsProfile = await fetch(`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${allNames[index]}%22%5D&callback=jQuery000000000000000_0000000000&_=0`).then(response => response.text());
							metricsProfile = JSON.parse(metricsProfile.slice(34, -4));

							if (!metricsProfile.clan || metricsProfile.clan !== 'Valence') {
								channels.errors.send(`${allNames[index]} is no longer in Valence and ${user.username} chose ❌ on name changes.`);
							}
							else {
								oldData = oldData.find(u => u.clanMate === metricsProfile.name);
								await usersDB.deleteOne({ clanMate: metricsProfile.name });
								await usersDB.insertOne(oldData);
							}
							index++;
						}
						catch (err) {
							console.error(err);
						}

						if (index === allNames.length) {
							clearInterval(interval);
						}
					}, 1000);
					settingsColl.updateOne({ _id: message.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } });
					return message.reactions.removeAll();
				}
				else if (reaction.emoji.name === '📝') {
					const filter = m => allNames.includes(m.content.toLowerCase());
					try {
						message.channel.send('Please type out one of the above suggested names.');
						let msg = await message.channel.awaitMessages(filter, { max: 1, time: 10000, errors: ['time'] });
						msg = msg.first();
						if (!msg.size) return message.channel.send('Timed out. Try again.');
						const found = messageMatch.data.find(u => u.clanMate === msg.content);
						usersDB.updateOne({ clanMate: found.potentialNewNames[0].clanMate }, {
							$set: {
								discord: found.discord,
								discActive: found.discActive,
								alt: found.alt,
								gameActive: found.gameActive,
							},
						});
						allNames.forEach(async u => {
							const user = await usersDB.findOne({ $text: { $search: u, $caseSensitive: false } });
							usersDB.deleteOne({ clanMate: user.clanMate });
							if (u === found.clanMate) return;
							await usersDB.insertOne(oldData);
						});
						settingsColl.updateOne({ _id: message.guild.id }, { $pull: { nameChange: { messageID: messageMatch.messageID } } });
						return message.reactions.removeAll();
					}
					catch (err) {
						channels.errors.send('Unknown error in messageReacitonAdd.js', err);
					}
				}
				else { return; }
			}

		}
		else { return; }
	}
};