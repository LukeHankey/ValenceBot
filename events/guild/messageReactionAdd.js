/* eslint-disable no-shadow */
/* eslint-disable max-nested-callbacks */
const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const cron = require('node-cron');
const { Paginate } = require('../../classes');
const { removeUsersAndMessages, compressArray } = require('../../functions');
const colors = require('../../colors.json');

module.exports = async (client, reaction, user) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');

	const message = reaction.message;

	if (process.env.NODE_ENV === 'DEV') {
		if (message.guild.id !== '733164313744769024') return;
	}
	else if (message.guild.id === '733164313744769024') {return;}

	if (message.partial) await message.fetch().catch(err => console.log(12, err));
	const { _id } = await settingsColl.findOne({ _id: message.guild.id });

	switch (message.guild.id) {
	case _id:
		// Valence
		if (_id === '472448603642920973' || _id === '733164313744769024') {
			const { events } = await settingsColl.findOne({ _id: message.guild.id }, { projection: { events: 1 } });
			const data = events.filter(m => m.messageID === message.id);

			if (!data.length || user.bot) return;
			if (reaction.emoji.name === '✅') {
				if (user.id !== message.author.id) {
					message.reactions.resolve('✅').users.remove(user.id);
					return;
				}
				reaction.message.reactions.removeAll();
				message.guild.roles.fetch(data[0].roleID).then(r => r.delete());
				settingsColl.findOneAndUpdate({ _id: message.guild.id }, { $pull: { events: { messageID: message.id } } });
				settingsColl.findOneAndUpdate({ _id: message.guild.id, 'calendarID.month': new Date(message.createdTimestamp).toLocaleString('default', { month: 'long' }) }, { $pull: { 'calendarID.$.events': { messageID: message.id } } });
			}
			else if (reaction.emoji.name === '📌') {
				const userFetch = await message.guild.members.fetch(user.id);
				userFetch.roles.add(data[0].roleID);
				await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'events.messageID': data[0].messageID }, { $addToSet: { 'events.$.members': user.id } });
			}
		}
		// DSF & Test servers
		else if (_id === '420803245758480405' || _id === '733164313744769024') {
			const { merchChannel: {
				channelID,
				spamProtection,
				blocked,
				spamMessagePost,
				deletions,
			} } = await settingsColl.findOne({ _id: message.guild.id },
				{ projection: {
					'merchChannel.channelID': 1,
					'merchChannel.spamProtection': 1,
					'merchChannel.blocked': 1,
					'merchChannel.spamMessagePost': 1,
					'merchChannel.deletions': 1,
				},
				});
			const modChannel = message.guild.channels.cache.find(ch => ch.name === 'moderator');
			const groundedRole = message.guild.roles.cache.find(r => r.name === 'Grounded');
			const pagination = new Paginate(reaction, { merchChannel: { channelID, spamProtection } });
			const embeds = pagination.paginate();
			let page = pagination.page;

			switch (message.channel.id) {
			case channelID: {
				if (user.bot) return;

				// Logging reaction timestamps
				console.log('Reaction added:', `MessageID: ${message.id}`, `By: ${user.username} (${user.id})`, `Reaction: ${reaction.emoji.toString() || reaction.reactionEmoji.toString()} | ${reaction.emoji.name || reaction.reactionEmoji.name} `, `${new Date(Date.now()).toString().split(' ').slice(0, -4).join(' ')} ${(new Date(Date.now()).getMilliseconds())}`);
				if (blocked) return;

				// Go through all messages in DB and get the members who are below the threshold in each message
				pagination.membersBelowThreshold.map(async mem => {
					const channel = client.channels.cache.get(channelID);
					try {
						const m = await channel.messages.fetch(mem.msg);

						// Remove all reactions if there is > 1 or 0. Then add a skull.
						if (Date.now() - m.createdTimestamp >= 3600000 && (m.reactions.cache.size > 1 || m.reactions.cache.size === 0)) {
							await m.reactions.removeAll();
							return await m.react('☠️');
						}
						// If there is only a skull, remove users and message from DB
						else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && m.reactions.cache.has('☠️')) {
							return removeUsersAndMessages(message, mem, settingsColl);
						}
						// If there is a single reaction which is not the Skull, then remove that and react with skull. Repeat process over.
						else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && !m.reactions.cache.has('☠️')) {
							await m.reactions.removeAll();
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
						else {return console.error(e);}
					}
				});

				// Adding users to the DB + counts
				spamProtection.map(async msg => {
					if (msg.userID === '668330399033851924') {
						settingsColl.findOneAndUpdate({ _id: message.guild.id }, {
							$pull: {
								'merchChannel.spamProtection': { userID: '668330399033851924' },
							},
						});
					}
					if (message.id === msg.messageID) {
						const newUser = {
							id: user.id,
							username: user.username,
							count: 1,
							reactions: [{
								emoji: reaction.emoji.name || reaction.reactionEmoji.name,
								count: 1,
							}],
						};

						const dbReactions = await spamProtection.filter(m => m.messageID === msg.messageID);
						const spamUsersDB = dbReactions.flatMap(u => u.users);

						// If there are no members added or none that match the member who reacted, add them.
						if (!spamUsersDB.length || !spamUsersDB.some(obj => obj.id === user.id)) {
							await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': msg.messageID }, {
								$addToSet: {
									'merchChannel.spamProtection.$.users': {
										$each: [
											newUser,
										],
									},
								},
							});
						}
						const [ moreThanOne ] = compressArray(spamUsersDB.map(obj => obj.id));
						if (moreThanOne && moreThanOne.count > 1) {
							const individual = spamUsersDB.find(obj => obj.id === moreThanOne.value);
							await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': message.id },
								{ $pull: {
									'merchChannel.spamProtection.$.users': { id: moreThanOne.value },
								},
								})
								.then(async () => {
									await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': msg.messageID }, {
										$addToSet: {
											'merchChannel.spamProtection.$.users': {
												$each: [
													individual,
												],
											},
										},
									});
								});
						}

						if (!spamUsersDB.length) return;
						const match = spamUsersDB.filter(obj => obj?.id === user.id);

						// False if reaction has not been added in DB before
						const [existingReactions] = spamUsersDB.map(obj => obj?.reactions.some(e => [e.emoji].includes(reaction.emoji.name)));

						if (existingReactions) {
							await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.users': match[0] }, {
								$inc: {
									'merchChannel.spamProtection.$.users.$[userObj].reactions.$[reaction].count': 1,
									'merchChannel.spamProtection.$.users.$[userObj].count': 1,
								},
							}, {
								arrayFilters: [{ 'reaction.count': { $gte: 0 }, 'reaction.emoji': reaction.emoji.name }, { 'userObj.count': { $gte: 0 }, 'userObj.id': user.id }],
							});
						}
						else {
							// More than 1 reaction, add to the DB
							await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.users': match[0] }, {
								$inc: {
									'merchChannel.spamProtection.$.users.$[userObj].count': 1,
								},
								$addToSet: {
									'merchChannel.spamProtection.$.users.$[userObj].reactions': {
										$each: [{ emoji: reaction.emoji.name, count: 1 }],
									},
								},
							}, {
								arrayFilters: [{ 'userObj.count': { $gte: 0 }, 'userObj.id': user.id }],
							});
						}
					}
				});

				// if (database.merchChannel.spamMessagePost.id.length) {
				// 	const spamPost = await database.merchChannel.spamMessagePost;
				// 	const getMessage = modChannel.messages.cache.get(spamPost.id) ?? await modChannel.messages.fetch(spamPost.id);
				// 	pagination.spamPost = getMessage;
				// 	const editEmbed = new MessageEmbed(embeds[0]);
				// 	if (!embeds.length || embeds === undefined) return;
				// 	editEmbed.spliceFields(0, 9, embeds[page].fields);
				// 	pagination.edit(editEmbed);
				// }
			}
				break;
			case modChannel.id: {
				// DSF as default
				let spamPostID;
				if (spamMessagePost && spamMessagePost.id.length) {
					spamPostID = spamMessagePost.id;
				}
				else { return; }
				const spamMessage = modChannel.messages.cache.get(spamPostID) ?? await modChannel.messages.fetch(spamPostID).catch(e => console.log(e));

				const checkGrounded = cron.schedule('* * * * *', async () => {
					spamProtection.map(async obj => {
						if (!obj.users.length) return;
						obj.users.map(async user => {
							const res = await message.guild.members.fetch({ user: user.id })
								.then(fetched => {
									if (!fetched._roles.includes(groundedRole.id)) {return;}
									if (fetched._roles.includes(groundedRole.id)) {
										return { result: true, messageID: obj.messageID, id: user.id };
									}
									else {
										return { result: false };
									}
								})
								.catch(e => {
									settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': obj.messageID },
										{ $pull: {
											'merchChannel.spamProtection.$.users': { id: e.path.split('/')[4] },
										},
										});
								});

							if (res === undefined) return;
							if (res && res.result) {
								if (obj.users.some(u => u.id === res.id)) {
									if (!obj.users.length) return;
									return await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': obj.messageID }, {
										$pull: {
											'merchChannel.spamProtection.$.users': { id: res.id },
										},
									});
								}
								checkGrounded.stop();
							}
						});
					});
				}, { scheduled: false });

				const manualUpdate = () => {
					pagination.spamPost = spamMessage;
					const editEmbed = new MessageEmbed(embeds[0]);
					if (!embeds.length) {
						spamMessage.delete();
						settingsColl.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.spamProtection': { messageID: spamMessage.id } }, $set: { 'merchChannel.spamMessagePost': { id: '', timestamp: '' } } });
					}
					editEmbed.spliceFields(0, 9, embeds[page].fields);
					return pagination.edit(editEmbed);
				};

				if (spamMessage.id === message.id) {
					if (reaction.me) return;
					if (reaction.emoji.name === '▶️') {
						if (page < embeds.length) {
							spamMessage.reactions.resolve('▶️').users.remove(user.id);
							page++;
							if (page === embeds.length) --page;
							spamMessage.edit(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`));
						}
						else { spamMessage.reactions.resolve('▶️').users.remove(user.id); }
					}
					else if (reaction.emoji.name === '◀️') {
						if (page !== 0) {
							spamMessage.reactions.resolve('◀️').users.remove(user.id);
							--page;
							spamMessage.edit(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`));
						}
						else { spamMessage.reactions.resolve('◀️').users.remove(user.id); }
					}
					else if (reaction.emoji.name === '📥') {
						spamMessage.reactions.resolve('📥').users.remove(user.id);
						manualUpdate();
					}
					else if (reaction.emoji.name === '⏰') {
						spamMessage.reactions.resolve('⏰').users.remove(user.id);
						checkGrounded.start();
					}
					else if (reaction.emoji.name === '⏹️') {
						spamMessage.reactions.resolve('⏹️').users.remove(user.id);
						checkGrounded.stop();
					}
					else {
						return;
					}
				}
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