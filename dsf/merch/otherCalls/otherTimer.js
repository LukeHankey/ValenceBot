const cron = require('node-cron');

const otherTimer = (message, updateDB, { errors }) => {
// Checking the DB and marking dead calls
	cron.schedule('*/5 * * * *', async () => {
		const { merchChannel: { otherMessages } } = await updateDB.findOne({ _id: message.guild.id }, { projection: { 'merchChannel.otherMessages': 1 } });
		for await (const { messageID, time } of otherMessages) {
			try {
				if (Date.now() - time > 2.7e+6) {
					await updateDB.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.otherMessages': { messageID } } });
				}
			}
			catch (e) {
				if (e.code === 10008) {
					const errorMessageID = e.path.split('/')[4];
					return await updateDB.updateOne({ _id: message.channel.guild.id }, { $pull: { 'merchChannel.otherMessages': { messageID: errorMessageID } } });
				}
				else { return errors.send(e, module); }
			}
		}
	});
};

module.exports = {
	otherTimer,
};