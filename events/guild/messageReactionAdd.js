const getDb = require('../../mongodb').getDb;

module.exports = async (client, reaction, user) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const message = reaction.message;

	if (message.partial) await message.fetch();
	const database = await settingsColl.findOne({ _id: `${message.guild.id}` });
	if (!database.events || !database.merchChannel) return;
	const data = database.events.filter(m => m.messageID === message.id);

	switch (message.channel.id) {
	case database.channels.events:
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
		// DSF Merch Reactions
		if (user.bot) return;
		const dataMessages = database.merchChannel.messages;
		// If messages are in DB and are reacted to, add them to spamProtection DB
		if (database.merchChannel.messages.map(x => x.messageID === message.id)[0]) {
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
			if (message.id === msg.messageID) {
				user.count = 1;
				user.reactions = [{ r: reaction.emoji.name, count: 1 }];

				try {
					const dbReactions = database.merchChannel.spamProtection.filter(m => m.messageID === msg.messageID);
					const spamUsersDB = dbReactions.map(u => u.users);
					if (!dbReactions[0].users) {
						await settingsColl.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': dbReactions[0].messageID }, {
							$set: {
								'merchChannel.spamProtection.$.users': [],
							},
						});
					}

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
							arrayFilters: [ { 'reaction.count': { $gte: 0 }, 'reaction.emoji': reaction.emoji.name }, { 'userObj.count': { $gte: 0 }, 'userObj.id': user.id } ],
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
							arrayFilters: [ { 'userObj.count': { $gte: 0 }, 'userObj.id': user.id } ],
						});
					}
				}
				catch (err) {
					console.log(err);
				}


				/**
				 * Take into account the number of times the skulls have been reacted to.
				 * Display Total times reactions have been clicked, the different reactions and number of each
				 * If above a threshold, ground them/send message to moderators to handle.
				 *
				 * Have the post auto-update every few minutes or so if there is anything to update. Store message ID in DB
				 * Check on the post who is above the threshold and if no role has been added to them, keep thier profile + message ID to refer back to.
				 * Send new post every 12 hours with old data ^ & if there are any new data. 12 hours || any message with users.length > 5 && (reactions.length > 5 || total reaction > 10 individually)
				 */

			}
		});
	}
		break;
	default:
		return;
	}
};