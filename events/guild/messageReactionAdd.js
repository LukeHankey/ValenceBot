const getDb = require('../../mongodb').getDb;

module.exports = async (client, reaction, user) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const message = reaction.message;

	if (message.partial) await message.fetch();
	const database = await settingsColl.findOne({ _id: `${message.guild.id}` });
	if (database.events === undefined) return;
	const data = database.events.filter(m => m.messageID === message.id);

	// Will only work for reactions where the message ID is inside the DB

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
};