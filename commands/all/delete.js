/* eslint-disable no-useless-escape */
module.exports = {
	name: 'del',
	description: ['Deletes a number of previous messages in the current channel.'],
	aliases: [],
	usage: ['<number>'],
	guildSpecific: 'all',
	run: async (client, message, args) => {
		const amount = parseInt(args[0]) + 1;

		if (!message.guild.me.hasPermission('MANAGE_MESSAGES')) return message.channel.send('Missing some permissions: \`MANAGE_MESSAGES\`.');

		if (isNaN(amount)) {
			return message.reply('Please enter a valid number.');
		}
		else
		if (amount <= 1 || amount >= 100) {
			return message.reply('You need to input a value between 1 and 99.');
		}
		try {
			message.channel.bulkDelete(amount, true);
		}
		catch (err) {
			console.error(err);
			message.channel.Xsend('There was an error trying to delete messages in this channel since they are older than 2 weeks!');
		}
	},
};