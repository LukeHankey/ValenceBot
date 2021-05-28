const cron = require('node-cron');

const skullTimer = (message, updateDB) => {
// Checking the DB and marking dead calls
	const timer = cron.schedule('* * * * *', async () => {
		const data = await updateDB.findOne({ _id: message.guild.id });
		const messagesDB = data.merchChannel.messages;
		for await (const doc of messagesDB) {
			const lastID = doc.messageID;
			const lastTime = doc.time;

			try {
				// Removes bot messages
				if (doc.userID === '668330399033851924' || doc.content.includes('<@&670842187461820436>')) {
					await updateDB.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: doc.messageID } } });
				}

				if (Date.now() - lastTime > 600000) {
					const fetched = await message.channel.messages.fetch(lastID);
					fetched.react('☠️')
						.then(async () => {
							await updateDB.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: lastID } } });
						})
						.catch(() => {
							return timer.stop();
						});
				}
			}
			catch (e) {
				if (e.code === 10008) {
					const errorMessageID = e.path.split('/')[4];
					return await updateDB.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: errorMessageID } } });
				}
				else { return console.error('Error in message timer:', e); }
			}
		}

		// Removing duplicates
		const counts = {};
		messagesDB.forEach(function(x) { counts[x.messageID] = (counts[x.messageID] || 0) + 1; });
		function getKeyByValue(object, value) {
			return Object.keys(object).find(key => object[key] === value);
		}
		Object.values(counts).forEach(dupe => {
			if (dupe > 1) {
				const message_id = getKeyByValue(counts, dupe);
				const entry = messagesDB.find(id => id.messageID === message_id);
				updateDB.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: message_id } } });
				return updateDB.updateOne({ _id: message.guild.id }, { $addToSet: { 'merchChannel.messages': entry } });
			}
			else {return;}
		});
	});
};

module.exports = {
	skullTimer,
};