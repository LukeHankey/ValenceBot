const getDb = require('../mongodb').getDb;
const { merchRegex } = require('./constants');
const { addMerchCount } = require('./merchChannel/merchCount');
const { skullTimer } = require('./merchChannel/skullTimer');
const { otherCalls } = require('./otherCalls/otherCount');

const dsf = async (client, message) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const { merchChannel: { channelID, otherChannelID } } = await settingsColl.findOne({ _id: message.guild.id, merchChannel: { $exists: true } }, { projection: { 'merchChannel.channelID': 1, 'merchChannel.otherChannelID': 1 } });

	if (message.channel.id === channelID) {
		if (message.author.bot) return;
		merchRegex.test(message.content)
			?
			message.channel.send(`<@&670842187461820436> - ${message.content}`)
				.then(async mes => {
					return await mes.delete({ timeout: 1000 });
				})
				.catch(async err => {
					console.log(14, err);
					const messageID = err.path.split('/');
					return await message.channel.messages.fetch(messageID[4]).then(x => x.delete()).catch(() => console.log('Unable to delete message'));
				})
			:	await message.delete({ timeout: 200 });

		await addMerchCount(client, message, settingsColl);
		skullTimer(message, settingsColl);
	}
	else if (message.channel.id === otherChannelID) {
		await otherCalls(message, settingsColl);
	}
	else {return;}
};

module.exports = {
	dsf,
};

