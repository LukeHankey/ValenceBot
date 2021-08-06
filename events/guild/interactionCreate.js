const getDb = require('../../mongodb').getDb;

module.exports = async (client, interaction) => {
	const db = getDb();
	const settings = db.collection('Settings');
	if (!interaction.isCommand()) return;

	if (interaction.commandName === 'vis') {
		const { visTime, vis } = await settings.findOne({ _id: 'Globals' }, { projection: { visTime: 1, vis: 1 } });
		let currentDate = new Date().toUTCString();
		currentDate = currentDate.split(' ');
		// eslint-disable-next-line no-unused-vars
		const [day, month, year, ...rest] = currentDate.slice(1);
		const savedDate = visTime.toString().split(' ');

		if (year !== savedDate[3] || month !== savedDate[1] || day !== savedDate[2]) {
			interaction.reply({ content: 'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command for others if you have the current stock.' });
			return await settings.updateOne({ _id: 'Globals' }, {
				$set: {
					vis: null,
				},
			});
		}
		if (vis === null) {
			await interaction.reply({ content: 'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command for others if you have the current stock.' });
		}
		else {
			await interaction.reply({ content: `**Image uploaded at:** ${visTime}`, files: [vis] });
		}
	}
};