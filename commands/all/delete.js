/* eslint-disable no-useless-escape */
module.exports = {
	name: 'del',
	description: ['Deletes a number of previous messages in the current channel.'],
	aliases: [],
	usage: ['<number>'],
	guildSpecific: 'all',
	permissionLevel: 'Mod',
	run: async (client, message, args, perms, channels) => {
		if (!perms.mod) return message.channel.send(perms.errorM);
		const amount = parseInt(args[0]) + 1;

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
			message.channel.Xsend('There was an error trying to delete messages in this channel since they are older than 2 weeks!');
			channels.errors.send('Unknown error in delete.js', `\`\`\`${err}\`\`\``);
		}
	},
};