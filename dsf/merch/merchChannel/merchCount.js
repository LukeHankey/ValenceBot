const { merchRegex } = require('../constants');
const { checkMemberRole, arrIncludesString, alreadyCalled } = require('../merchFunctions');
const getDb = require('../../../mongodb').getDb;

const addMerchCount = async (client, message, updateDB, { errors }) => {
	try {
		const db = getDb();
		const settingsColl = db.collection('Settings');
		const { merchChannel: { scoutTracker, channelID, messages }, disallowedWords } = await settingsColl.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.scoutTracker': 1, 'merchChannel.channelID': 1, 'merchChannel.messages': 1, disallowedWords: 1 } });
		const merchChannelID = client.channels.cache.get(channelID);
		let errorLog = [];
		const botServerWebhook = await client.channels.cache.get('784543962174062608').fetchWebhooks();
		const dsfServerWebhook = await client.channels.cache.get('794608385106509824').fetchWebhooks();
		errorLog.push(dsfServerWebhook.first(), botServerWebhook.first());

		// Adding count to members
		const mesOne = await message.channel.messages.fetch({ limit: 1 });
		const logOne = [...mesOne.values()];
		const msg = logOne.map(val => val);

		const userN = message.member;
		const findMessage = scoutTracker.find(x => x.userID === userN.id);
		if (!findMessage) {
			if (!merchRegex.test(message.content) || !arrIncludesString(disallowedWords, message.content) || !alreadyCalled(message, messages)) {
				console.log(`New & Spam: ${userN.user.username} (${message.content})`, userN.id);
				if (message.guild.id === '668330890790699079') {
					errorLog = errorLog.pop();
					return errorLog.send({ content: ` \`\`\`diff\n\n+ Spam Message - (User has not posted before)\n- User ID: ${userN.id}\n- User: ${userN.user.username}\n- Content: ${message.content}\`\`\`` });
				}
				return errorLog.forEach(id => id.send({ content: ` \`\`\`diff\n\n+ Spam Message - (User has not posted before)\n- User ID: ${userN.id}\n- User: ${userN.user.username}\n- Content: ${message.content}\`\`\`` }));
			}
			console.log(`New: ${userN.user.username} (${message.content})`, userN.id);
			await updateDB.findOneAndUpdate({ _id: message.channel.guild.id },
				{
					$addToSet: {
						'merchChannel.scoutTracker': {
							$each: [{
								userID: userN.id,
								author: userN.nickname ?? userN.user.username,
								firstTimestamp: msg[0].createdTimestamp,
								firstTimestampReadable: new Date(msg[0].createdTimestamp),
								lastTimestamp: msg[0].createdTimestamp,
								lastTimestampReadable: new Date(msg[0].createdTimestamp),
								count: 1,
								game: 0,
								otherCount: 0,
								active: 1,
								assigned: [],
							}],
						},
					},
				});
			if (!(await checkMemberRole(userN.id, message))) {
				console.log(`Adding ${userN.nickname ?? userN.user.username} (${userN.id}) to channel overrides.`);
				await merchChannelID.permissionOverwrites.create(userN.id, { ADD_REACTIONS: true });
			}
		}
		else {
			if (!merchRegex.test(message.content) || !arrIncludesString(disallowedWords, message.content) || !alreadyCalled(message, messages)) {
				console.log(`Old & Spam: ${userN.user.username} (${message.content})`, userN.user.id);
				if (message.guild.id === '668330890790699079') {
					errorLog = errorLog.pop();
					return errorLog.send({ content: ` \`\`\`diff\n+ Spam Message - (User has posted before)\n\n- User ID: ${userN.user.id}\n- User: ${userN.user.username}\n- Content: ${message.content}\`\`\`` });
				}
				return errorLog.forEach(id => id.send({ content: ` \`\`\`diff\n+ Spam Message - (User has posted before)\n\n- User ID: ${userN.user.id}\n- User: ${userN.user.username}\n- Content: ${message.content}\`\`\`` }));
			}
			console.log(`Old: ${userN.user.username} (${message.content})`, findMessage.userID === userN.id, findMessage.userID, userN.id);
			await updateDB.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
				$inc: {
					'merchChannel.scoutTracker.$.count': 1,
				},
				$set: {
					'merchChannel.scoutTracker.$.author': userN.nickname ?? userN.user.username,
					'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
					'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
					'merchChannel.scoutTracker.$.active': 1,
				},
			});
			if (!(await checkMemberRole(userN.id, message))) {
				console.log(`Adding ${userN.user.username} (${userN.id}) to channel overrides.`);
				await merchChannelID.permissionOverwrites.create(userN.id, { ADD_REACTIONS: true });
			}
		}

		// Database logging for merch worlds
		let mes = await message.channel.messages.fetch({ limit: 10 });
		mes = mes.filter(m => {
			if (m.reactions.cache.has('☠️')) return;
			else return mes;
		});
		const log = [...mes.values()];
		for (const msgs in log) {
			const authorName = log[msgs].member?.nickname ?? log[msgs].author.username;
			const userId = log[msgs].member?.id ?? log[msgs].author.id;
			if (authorName === null) return;
			await updateDB.findOneAndUpdate({ _id: message.channel.guild.id },
				{
					$addToSet: {
						'merchChannel.messages': {
							$each: [{
								messageID: log[msgs].id,
								content: log[msgs].content,
								time: log[msgs].createdTimestamp,
								author: authorName,
								userID: userId,
							}],
						},
						'merchChannel.spamProtection': {
							$each: [{
								messageID: log[msgs].id,
								content: log[msgs].content,
								time: log[msgs].createdTimestamp,
								author: authorName,
								userID: userId,
							}],
						},
					},

				},
			);
		}
	}
	catch (err) {
		errors.send(err, module);
	}
};

module.exports = {
	addMerchCount,
};
