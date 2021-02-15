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
	const database = await settingsColl.findOne({ _id: `${message.guild.id}` });
	const modChannel = message.guild.channels.cache.find(ch => ch.name === 'moderator');

	const embedData = await database.merchChannel.spamProtection.map(obj => {
		// obj = messageID, content, time, author, userID, users[]
		const messageLink = `https://discord.com/channels/${message.guild.id}/${database.merchChannel.channelID}/${obj.messageID}`;
		const usersList = obj.users.map(userObj => {
			// userObj = User, total count, skull count, reactions[]
			let skullsCount = 0;
			userObj.reactions.filter(r => {
				if (['☠️', '💀', '<:skull:805917068670402581>'].includes(r.emoji)) {
					skullsCount = skullsCount + r.count;
				}
			});
			return { totalCount: userObj.count, skullCount: skullsCount, user: { id: userObj.id, username: userObj.username }, reactions: userObj.reactions };
		});

		/**
		 * Filters to not spam add to the embed
		 * If any data gets through filters, check reactions and work total count out
		 * Filters: (reactions.length > 5 || total reaction > 10 individually)
		 * reactions.length seems to not be 100% accurate but the total and skull counts are.
		 */
		const fieldGenerator = () => {
			const first = { name: '\u200B', value: `Grouped below are for [this message from ${obj.author} | ${obj.content}.](${messageLink})` };
			const dataFields = [];
			usersList.forEach(u => {
				// Filters added here
				if (u.totalCount > 9 || u.reactions.length > 4) {
					const emojis = u.reactions.map(e => { return `${e.emoji} **- ${e.count}**`; });
					dataFields.push({ name: `${u.user.username} - ${u.user.id}`, value: `Mention: <@!${u.user.id}>\nTotal Reacts (${u.skullCount}/${u.totalCount})\n\n${emojis.join('  |   ')}`, inline: true });
				}
				else { return; }
			});
			if (dataFields.length) {
				dataFields.unshift(first);
				if (obj.users.length > 8) {
					// Pagination
					dataFields.splice(9, 0, first);
				}
			}
			return dataFields;
		};
		const fields = [];
		// Cron here to maybe for the 12 hour timer
		fields.push(...fieldGenerator());
		return fields;
	});
	const pagination = new Paginate(reaction, database, embedData);
	let embeds = pagination.embeds;
	let page = pagination.page;

	switch (message.channel.id) {
	case database.channels.events:
		if(!database.events) return;
		// eslint-disable-next-line no-case-declarations
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
		break;
	case database.merchChannel.channelID: {
		if (!database.merchChannel) return;
		// DSF Merch Reactions
		const groundedRole = message.guild.roles.cache.find(r => r.name === 'Grounded');
		const groundedCheck = async () => {
			const fetchReactor = await message.guild.members.fetch(user.id);
			return fetchReactor.roles.cache.has(groundedRole.id);
		};
		if (user.bot) return;
		const dataMessages = database.merchChannel.messages;
		dataMessages.map(x => x.users = []);
		// If messages are in DB and are reacted to, add them to spamProtection DB
		const index = database.merchChannel.messages.findIndex(x => x.messageID === message.id);
		if (database.merchChannel.messages.map(x => x.messageID === message.id)[index]) {
			if (!database.merchChannel.spamProtection.some(msg => msg.messageID === message.id)) {
				settingsColl.findOneAndUpdate({ _id: message.guild.id }, {
					$addToSet: {
						'merchChannel.spamProtection': {
							$each: dataMessages,
						},
					},
				});
			}
		}
		database.merchChannel.spamProtection.map(async msg => {
			if (msg.author === 'Valence Bot') {
				settingsColl.findOneAndUpdate({ _id: message.guild.id }, {
					$pull: {
						'merchChannel.spamProtection': { author: 'Valence Bot' },
					},
				});
			}
			if (message.id === msg.messageID) {
				user.count = 1;
				user.reactions = [{ emoji: reaction.emoji.name, count: 1 }];

				try {
					const dbReactions = database.merchChannel.spamProtection.filter(m => m.messageID === msg.messageID);
					const spamUsersDB = dbReactions.map(u => u.users);

					if (await groundedCheck() === false) {
						// If there are no members added or none that match the member who reacted, add them.
						if (!spamUsersDB.flat().length || !spamUsersDB.flat().some(obj => obj?.id === user.id)) {
							await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': msg.messageID }, {
								$addToSet: {
									'merchChannel.spamProtection.$.users': {
										$each: [
											user,
										],
									},
								},
							});
						}
					}
					else { return;}

					if (!spamUsersDB.flat().length) return;
					const match = spamUsersDB.flat().filter(obj => obj?.id === user.id);

					// False if reaction has not been added in DB before
					const [existingReactions] = spamUsersDB.flat().map(obj => obj?.reactions.some(e => [e.emoji].includes(reaction.emoji.name)));

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
		});
		if (await groundedCheck()) return;
		/**
			 * Take into account the number of times the skulls have been reacted to.
			 * Display Total times reactions have been clicked, the different reactions and number of each
			 * If above a threshold, ground them/send message to moderators to handle.
			 *
			 * Have the post auto-update every few minutes or so if there is anything to update. Store message ID in DB
			 * Check on the post who is above the threshold and if no role has been added to them, keep thier profile + message ID to refer back to.
			 * Send new post every 12 hours with old data ^ & if there are any new data. 12 hours || any message with users.length > 5 && (reactions.length > 5 || total reaction > 10 individually)
			 *
			 * Remove posts in DB 1 hour after they were sent unless they have reaction spamming on
			 *
			 *
			 * Maybe add:
			 * Check every minute for each user if they have the grounded role added to them.
			 * If so, remove their reactions on the post(s). Or, disable ;sa command and add grounded role myself depending on different criteria
			 */

		if (!database.merchChannel.spamMessagePost || !database.merchChannel.spamMessagePost.id) {
			embeds = pagination.paginate();
			if (!embeds.length) return;
			const msg = await modChannel.send(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`));
			await settingsColl.findOneAndUpdate({ _id: message.guild.id }, {
				$set: {
					'merchChannel.spamMessagePost': { id: msg.id, timestamp: msg.createdTimestamp },
				},
			}, { upsert: true });
			await msg.react('◀️');
			await msg.react('▶️');
		}
		else {
			embeds = pagination.paginate();
			const spamPost = await database.merchChannel.spamMessagePost;
			const getMessage = modChannel.messages.cache.get(spamPost.id) ?? await modChannel.messages.fetch(spamPost.id);
			try {
				pagination.spamPost = getMessage;

				const editEmbed = new MessageEmbed(embeds[0]);
				editEmbed.spliceFields(0, 9, embeds[page].fields);
				pagination.edit(editEmbed);

				const reactTimer = cron.schedule('*/10 * * * * *', async () => {
					const result = await pagination.checkGroundedRoles();
					const [x] = result.filter(o => o.result);
					if (!x) return;
					if (x.result) {
						const memberID = pagination.thresholdMembers.find(id => id === x.id);
						await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': x.messageID }, {
							$pull: {
								'merchChannel.spamProtection.$.users': { id: memberID },
							},
						});
						const update = await settingsColl.findOne({ _id: message.guild.id });
						pagination.updatedDB = update;
						await pagination.usersCheck().forEach(m => {
							settingsColl.updateOne({ _id: message.guild.id }, {
								$pull: {
									'merchChannel.spamProtection': { messageID: m },
								},
							});
						});
					}
					reactTimer.stop();
				}, { scheduled: false });
				reactTimer.start();

				if (Date.now() - spamPost.timestamp >= 3600000) {
					pagination.membersBelowThreshold.map(async mem => {
						message.channel.messages.fetch(mem.msg).then(m => {
							return m.reactions.removeAll().then(m => m.react('☠️'));
						});
						if (mem.member.id !== null) {
							await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': mem.msg }, {
								$pull: {
									'merchChannel.spamProtection.$.users': { id: mem.member.id },
								},
							});
						}
						settingsColl.findOne({ _id: message.guild.id })
							.then(updated => {
								const db = updated.merchChannel.spamProtection;
								db.map(obj => {
									if (obj.messageID === mem.msg) {
										if (!obj.users.length) {
											settingsColl.findOneAndUpdate({ _id: message.guild.id }, {
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
					getMessage.delete();
					settingsColl.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'merchChannel.spamMessagePost': { id: '', timestamp: '' } } });
					reactTimer.stop();
				}
			}
			catch (err) {
				if (err) {
					if (!embeds.length) {
						getMessage.delete();
						settingsColl.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.spamProtection': { messageID: getMessage.id } }, $set: { 'merchChannel.spamMessagePost': { id: '', timestamp: '' } } });
					}
					if (err.code === 10008) {
						const messageID = err.path.split('/')[4];
						settingsColl.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.spamProtection': { messageID: messageID } } });
					}
				}
			}
		}
	}
		break;
	default: {
		if (message.channel.id !== modChannel.id) return;
		const spamPostID = await modChannel.messages.fetch(database.merchChannel.spamMessagePost.id);
		if (!spamPostID) {return;}
		if (spamPostID.id === message.id) {
			if(reaction.me) return;
			embeds = pagination.paginate();
			if (reaction.emoji.name === '▶️') {
				if (page < embeds.length) {
					spamPostID.reactions.resolve('▶️').users.remove(user.id);
					page++;
					if (page === embeds.length) --page;
					spamPostID.edit(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`));
				}
				else { spamPostID.reactions.resolve('▶️').users.remove(user.id); }
			}
			else if (reaction.emoji.name === '◀️') {
				if (page !== 0) {
					spamPostID.reactions.resolve('◀️').users.remove(user.id);
					--page;
					spamPostID.edit(embeds[page].setFooter(`Page ${page + 1} of ${embeds.length}`));
				}
				else { spamPostID.reactions.resolve('◀️').users.remove(user.id); }
			}
			else {
				return;
			}
		}
	}
	}
};