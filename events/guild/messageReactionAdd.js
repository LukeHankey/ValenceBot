/* eslint-disable no-shadow */
/* eslint-disable max-nested-callbacks */
const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const cron = require('node-cron');
const { Paginate } = require('../../classes');
const { removeUsersAndMessages } = require('../../functions');

module.exports = async (client, reaction, user) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const message = reaction.message;

	if (message.partial) await message.fetch().catch(err => console.log(12, err));
	const database = await settingsColl.findOne({ _id: message.guild.id });

	function compressArray(original) {

		const compressed = [];
		// make a copy of the input array
		const copy = original.slice(0);

		// first loop goes over every element
		for (let i = 0; i < original.length; i++) {

			let myCount = 0;
			// loop over every element in the copy and see if it's the same
			for (let w = 0; w < copy.length; w++) {
				if (original[i] == copy[w]) {
					// increase amount of times duplicate is found
					myCount++;
					// sets item to undefined
					delete copy[w].id;
				}
			}

			if (myCount > 0) {
				const a = new Object();
				a.value = original[i];
				a.count = myCount;
				compressed.push(a);
			}
		}

		return compressed;
	}

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
			const embeds = pagination.paginate();
			let page = pagination.page;

			switch (message.channel.id) {
			case database.merchChannel.channelID: {
				if (user.bot) return;

				// Logging reaction timestamps
				console.log('Reaction added:', `MessageID: ${message.id}`, `By: ${user.username} (${user.id})`, `Reaction: ${reaction.emoji.toString() || reaction.reactionEmoji.toString()} | ${reaction.emoji.name || reaction.reactionEmoji.name} `, `${new Date(Date.now()).toString().split(' ').slice(0, -4).join(' ')} ${(new Date(Date.now()).getMilliseconds())}`);

				// Return if a member has the grounded role
				message.guild.members.cache.get(user.id) || message.guild.members.fetch(user.id).then(mem => {
					if (mem.roles.cache.has(groundedRole.id)) {
						return;
					}
				})
					.catch(err => {
						if (err.code === 10007) {
							console.log(`Unable to fetch member (${err.path.split(' ')[4]}). They have been kicked or left the server.`);
						}
						console.error(52, err);
					});

				// Adding users to the DB + counts
				database.merchChannel.spamProtection.map(async msg => {
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

						const dbReactions = await database.merchChannel.spamProtection.filter(m => m.messageID === msg.messageID);
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
					// For each message, check if it's older than 1 hour. If so, remove if no members above threshold
					if (Date.now() - msg.time >= 3600000) {
						// Go through all messages in DB and get the members who are below the threshold in each message
						pagination.membersBelowThreshold.map(async mem => {
							const channelID = database.merchChannel.channelID;
							const channel = client.channels.cache.get(channelID);

							try {
								const m = await channel.messages.fetch(mem.msg);

								// Remove all reactions if there is > 1 or 0. Then add a skull.
								if (Date.now() - m.createdTimestamp >= 3600000 && (m.reactions.cache.size > 1 || m.reactions.cache.size === 0)) {
									await m.reactions.removeAll();
									await m.react('☠️');
								}
								// If there is only a skull, remove users and message from DB
								else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && m.reactions.cache.has('☠️')) {
									removeUsersAndMessages(message, mem, settingsColl);
								}
								// If there is a single reaction which is not the Skull, then remove that and react with skull. Repeat process over.
								else if (Date.now() - m.createdTimestamp >= 3600000 && m.reactions.cache.size === 1 && !m.reactions.cache.has('☠️')) {
									await m.reactions.removeAll();
									await m.react('☠️');
								}
								else {return message.react('❌');}
								await message.react('✅');
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

				if (database.merchChannel.spamMessagePost.id.length) {
					const spamPost = await database.merchChannel.spamMessagePost;
					const getMessage = modChannel.messages.cache.get(spamPost.id) ?? await modChannel.messages.fetch(spamPost.id);
					pagination.spamPost = getMessage;
					const editEmbed = new MessageEmbed(embeds[0]);
					if (!embeds.length || embeds === undefined) return;
					editEmbed.spliceFields(0, 9, embeds[page].fields);
					pagination.edit(editEmbed);
				}
			}
				break;
			case modChannel.id: {
				// DSF as default
				let spamPostID;
				if (database.merchChannel.spamMessagePost && database.merchChannel.spamMessagePost.id.length) {
					spamPostID = database.merchChannel.spamMessagePost.id;
				}
				else { return; }
				const spamMessage = modChannel.messages.cache.get(spamPostID) ?? await modChannel.messages.fetch(spamPostID).catch(e => console.log(e));

				const checkGrounded = cron.schedule('* * * * *', async () => {
					database.merchChannel.spamProtection.map(async obj => {
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
			}
		}
		else { return; }
		break;
	}
};