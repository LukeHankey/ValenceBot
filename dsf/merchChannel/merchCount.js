const { merchRegex, lobbyWorldsSpace, lobbyWorldsNoSpace } = require('../constants');
const getDb = require('../../mongodb').getDb;

const addMerchCount = async (client, message, updateDB) => {
	try {
		const db = getDb();
		const settingsColl = db.collection('Settings');
		const { merchChannel: { scoutTracker } } = await settingsColl.findOne({ _id: message.guild.id }, { projection: { 'merchChannel.scoutTracker': 1 } });
		const errorLog = [];
		const botServerWebhook = await client.channels.cache.get('784543962174062608').fetchWebhooks();
		const dsfServerWebhook = await client.channels.cache.get('794608385106509824').fetchWebhooks();
		errorLog.push(dsfServerWebhook.first(), botServerWebhook.first());

		// Adding count to members
		const mesOne = await message.channel.messages.fetch({ limit: 1 });
		const logOne = [...mesOne.values()];
		const msg = logOne.map(val => val);

		const findMessage = scoutTracker.find(x => x.userID === msg[0].author.id);
		const userN = message.member;
		if (!findMessage) {
			if (!merchRegex.test(message.content)) {
				console.log(`New & Spam: ${userN.user.username} (${message.content})`, userN.id);
				return errorLog.forEach(id => id.send(` \`\`\`diff\n\n+ Spam Message - (User has not posted before)\n- User ID: ${userN.id}\n- User: ${userN.user.username}\n- Content: ${message.content}\`\`\``));
			}
			console.log(`New: ${userN.user.username} (${message.content})`, userN.id);
			await updateDB.findOneAndUpdate({ _id: message.guild.id },
				{
					$addToSet: {
						'merchChannel.scoutTracker': {
							$each: [{
								userID: msg[0].author.id,
								author: msg[0].member?.nickname ?? msg[0].author.username,
								firstTimestamp: msg[0].createdTimestamp,
								firstTimestampReadable: new Date(msg[0].createdTimestamp),
								lastTimestamp: msg[0].createdTimestamp,
								lastTimestampReadable: new Date(msg[0].createdTimestamp),
								count: 1,
								otherCount: 0,
								assigned: [],
							}],
						},
					},
				});
			if (lobbyWorldsSpace.test(message.content)) {
				await message.delete();
				message.channel.send(`${message.content.slice(0, 5)} - You must go to the __lobby__ to see this in the worlds list.`);
			}
			else if (lobbyWorldsNoSpace.test(message.content)) {
				await message.delete();
				message.channel.send(`${message.content.slice(0, 4)} - You must go to the __lobby__ to see this in the worlds list.`);
			}
		}
		else {
			if (!merchRegex.test(message.content)) {
				console.log(`Old & Spam: ${userN.user.username} (${message.content})`, userN.user.id);
				return errorLog.forEach(id => id.send(` \`\`\`diff\n+ Spam Message - (User has posted before)\n\n- User ID: ${userN.user.id}\n- User: ${userN.user.username}\n- Content: ${message.content}\`\`\``));
			}
			console.log(`Old: ${userN.user.username} (${message.content})`, findMessage.userID === userN.id, findMessage.userID);
			await updateDB.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
				$inc: {
					'merchChannel.scoutTracker.$.count': 1,
				},
				$set: {
					'merchChannel.scoutTracker.$.author': msg[0].member?.nickname ?? msg[0].author.username,
					'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
					'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
				},
			});
			if (lobbyWorldsSpace.test(message.content)) {
				await message.delete();
				message.channel.send(`${message.content.slice(0, 5)} - You must go to the __lobby__ to see this in the worlds list.`);
			}
			else if (lobbyWorldsNoSpace.test(message.content)) {
				await message.delete();
				message.channel.send(`${message.content.slice(0, 4)} - You must go to the __lobby__ to see this in the worlds list.`);
			}
		}

		// Database logging for merch worlds
		let mes = await message.channel.messages.fetch({ limit: 10 });
		mes = mes.filter(m => {
			if (m.reactions.cache.has('☠️')) return;
			else return mes;
		});
		const log = [...mes.values()];
		for (const messages in log) {
			const authorName = log[messages].member?.nickname ?? log[messages].author.username;
			const userId = log[messages].member?.id ?? log[messages].author.id;
			if (authorName === null) return;
			await updateDB.findOneAndUpdate({ _id: message.guild.id },
				{
					$addToSet: {
						'merchChannel.messages': {
							$each: [{
								messageID: log[messages].id,
								content: log[messages].content,
								time: log[messages].createdTimestamp,
								author: authorName,
								userID: userId,
							}],
						},
						'merchChannel.spamProtection': {
							$each: [{
								messageID: log[messages].id,
								content: log[messages].content,
								time: log[messages].createdTimestamp,
								author: authorName,
								userID: userId,
								users: [],
							}],
						},
					},

				},
			);
		}
	}
	catch (err) {
		console.log(err);
	}
};

module.exports = {
	addMerchCount,
};
