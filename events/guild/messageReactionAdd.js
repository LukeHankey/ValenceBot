/* eslint-disable no-shadow */
/* eslint-disable max-nested-callbacks */
const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const cron = require('node-cron');
const { Paginate } = require('../../classes');

module.exports = async (client, reaction, user) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const message = reaction.message;

	if (message.partial) await message.fetch().catch(err => console.log(12, err));
	const database = await settingsColl.findOne({ _id: message.guild.id });

	switch (message.guild.id) {
	case database._id:
		// Valence
		if (database._id === '472448603642920973') {
			const data = database.events.filter(m => m.messageID === message.id);

			// Will only work for reactions where the message ID is inside the DB
			// Valence Events

			if (!data.length || user.bot) return;
			if (reaction.emoji.name === '✅') {
				if (user.id !== message.author.id) {
					message.reactions.resolve('✅').users.remove(user.id);
					return;
				}
				reaction.message.reactions.removeAll();
				message.guild.roles.fetch(data[0].roleID).then(r => r.delete());
				settingsColl.findOneAndUpdate({ _id: message.guild.id }, { $pull: { events: { messageID: message.id } } });
			}
			else if (reaction.emoji.name === '📌') {
				const userFetch = await message.guild.members.fetch(user.id);
				userFetch.roles.add(data[0].roleID);
				await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'events.messageID': data[0].messageID }, { $addToSet: { 'events.$.members': user.id } });
			}
		}
		// DSF & Test servers
		else if (database._id === '420803245758480405' || database._id === '733164313744769024') {
			const modChannel = message.guild.channels.cache.find(ch => ch.name === 'moderator');
			const groundedRole = message.guild.roles.cache.find(r => r.name === 'Grounded');
			const pagination = new Paginate(reaction, database);
			let embeds = pagination.embeds;
			let page = pagination.page;

			switch (message.channel.id) {
			case database.merchChannel.channelID: {
				const spamProtection = database.merchChannel.spamProtection;
				if (user.bot) return;

				// Return if a member has the grounded role
				message.guild.members.fetch(user.id).then(mem => {
					if (mem.roles.cache.has(groundedRole.id)) {
						return;
					}
				});

				const newUser = {
					id: user.id,
					username: user.username,
					count: 1,
					reactions: [{
						emoji: reaction.emoji.name,
						count: 1,
					}],
				};

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
						try {
							const dbReactions = spamProtection.filter(m => m.messageID === msg.messageID);
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
						catch (err) {
							console.log(err);
						}
					}
					// For each message, check if it's older than 1 hour. If so, remove if no members above threshold
					if (Date.now() - msg.time >= 3600000) {
						// Go through all messages in DB and get the members who are below the threshold in each message
						pagination.membersBelowThreshold.map(async mem => {
							const channelID = database.merchChannel.channelID;
							const channel = client.channels.cache.get(channelID);

							const removeUsersAndMessages = async () => {
								if (mem.member.id !== null) {
									await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': mem.msg }, {
										$pull: {
											'merchChannel.spamProtection.$.users': { id: mem.member.id },
										},
									});
								}
								const removeMessages = async () => {
									const db = await settingsColl.findOne({ _id: message.guild.id });
									db.merchChannel.spamProtection.forEach(obj => {
										if (obj.messageID !== mem.msg) return;
										if (!obj.users.length) {
											settingsColl.updateOne({ _id: message.guild.id }, {
												$pull: {
													'merchChannel.spamProtection': { messageID: obj.messageID },
												},
											});
										}
										else {return;}
									});
								};
								return await removeMessages();
							};

							try {
								const m = await channel.messages.fetch(mem.msg);
								// Remove all reactions if there is > 1. Then add a skull.
								if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size > 1) {
									await m.reactions.removeAll();
									await m.react('☠️');
								}
								// If there is only a skull, remove users and message from DB
								else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && m.reactions.cache.has('☠️')) {
									removeUsersAndMessages();
								}
								else {return;}
							}
							catch (e) {
								if (e.code === 10008) {
									const messageID = e.path.split('/')[4];
									await settingsColl.updateOne({ _id: message.guild.id }, {
										$pull: {
											'merchChannel.spamProtection': { messageID: messageID },
										},
									});
								}
								else {console.error(e);}
							}
						});
					}
				});
				embeds = pagination.paginate();

				if (database.merchChannel.spamMessagePost.id.length) {
					const spamPost = await database.merchChannel.spamMessagePost;
					const getMessage = modChannel.messages.cache.get(spamPost.id) ?? await modChannel.messages.fetch(spamPost.id);
					try {
						// Edit the embed every time there is someone who meets the treshhold
						pagination.spamPost = getMessage;
						const editEmbed = new MessageEmbed(embeds[0]);
						editEmbed.spliceFields(0, 9, embeds[page].fields);
						pagination.edit(editEmbed);

						// Every 2 minutes, check members who are on the embed
						const reactTimer = cron.schedule('*/10 * * * * *', async () => {
							// Check if they have the grounded role - React has to happen on the same message
							const result = await pagination.checkGroundedRoles();
							if (!result) return;
							// Filter for results where the member has the role added to make the result true
							const [x] = result.filter(o => o.result);
							// If they do have the role
							if (x && x.result) {
								// Remove them from the database in all messages
								spamProtection.map(async obj => {
									if (obj.users.some(u => u.id === x.id)) {
										if (!obj.users.length) return;
										await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': obj.messageID }, {
											$pull: {
												'merchChannel.spamProtection.$.users': { id: x.id },
											},
										});
									}
								});
							}
							reactTimer.stop();
						}, { scheduled: false });
						reactTimer.start();
					}
					catch (err) {
						if (err) {
							if (!embeds.length) {
								getMessage.delete();
								settingsColl.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.spamProtection': { messageID: getMessage.id } }, $set: { 'merchChannel.spamMessagePost': { id: '', timestamp: '' } } });
							}
						}
					}
				}
			}
				break;
			case modChannel.id: {
				// DSF as default
				let spamPostID;
				if (database.merchChannel.spamMessagePost && database.merchChannel.spamMessagePost.id.length) {
					spamPostID = database.merchChannel.spamMessagePost.id;
				}
				else {return;}
				const spamMessage = await modChannel.messages.fetch(spamPostID).catch(e => console.log(e));
				if (spamMessage.id === message.id) {
					if (reaction.me) return;
					embeds = pagination.paginate();
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
					else {
						return;
					}
				}
			}
			}
		}
		else {return;}
		break;
	}
};