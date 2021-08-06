const getDb = require('../../../mongodb').getDb;

const otherCalls = async (message, updateDB, { errors }) => {
	// Adds count for other events channel
	try {
		const db = getDb();
		const settingsColl = db.collection('Settings');
		const { merchChannel: { scoutTracker } } = await settingsColl.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.scoutTracker': 1 } });
		const mesOne = await message.channel.messages.fetch({ limit: 1 });
		const logOne = [...mesOne.values()];
		const msg = logOne.map(val => val);

		const findMessage = await scoutTracker.find(x => x.userID === msg[0].author.id);
		if (!findMessage) {
			console.log(`New other: ${msg[0].author.username} (${message.content})`, msg[0].author.id);
			await updateDB.findOneAndUpdate({ _id: message.channel.guild.id },
				{
					$addToSet: {
						'merchChannel.scoutTracker': {
							$each: [{
								userID: msg[0].author.id,
								author: msg[0].member.nickname ?? msg[0].author.username,
								firstTimestamp: msg[0].createdTimestamp,
								firstTimestampReadable: new Date(msg[0].createdTimestamp),
								lastTimestamp: msg[0].createdTimestamp,
								lastTimestampReadable: new Date(msg[0].createdTimestamp),
								count: 0,
								game: 0,
								otherCount: 1,
								active: 1,
								assigned: [],
							}],
						},
					},
				});
		}
		else {
			console.log(`Old other: ${msg[0].author.username} (${message.content})`, msg[0].author.id);
			await updateDB.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
				$inc: {
					'merchChannel.scoutTracker.$.otherCount': 1,
				},
				$set: {
					'merchChannel.scoutTracker.$.author': msg[0].member?.nickname ?? msg[0].author.username,
					'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
					'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
					'merchChannel.scoutTracker.$.active': 1,
				},
			});
		}
	}
	catch (e) {
		errors.send(e, module);
	}
};

module.exports = {
	otherCalls,
};