/* eslint-disable no-shadow */
const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const { removeMessage, removeEvents } = require('../../functions');
const colors = require('../../colors.json');

module.exports = async (client, reaction, user) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const message = reaction.message;

	if (process.env.NODE_ENV === 'DEV') {
		if (message.guild.id !== '733164313744769024') return;
	}
	else if (message.guild.id === '733164313744769024') {return;}

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
						else { return channels.errors.send('Unknown error in messageReactionAdd.js', `\`\`\`${e}\`\`\``); }
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
		else { return; }
	}
};