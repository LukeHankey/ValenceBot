const { MessageEmbed } = require('discord.js');
const colors = require('../../colors.json');

module.exports = {
	name: 'vote',
	description: ['Poll a message in which people can react with ✅ or ❌ or ❓.'],
	aliases: [],
	usage: ['<question>'],
	guildSpecific: 'all',
	permissionLevel: 'Mod',
	run: async (client, message, args, perms, channels) => {
		if (!perms.mod) return message.channel.send(perms.errorM);
		const content = args.join(' ');

		const embed = new MessageEmbed()
			.setTitle('New Vote!')
			.setDescription(`${content}`)
			.setColor(colors.orange)
			.setTimestamp();

		message.delete();
		message.channel.send(embed).then(async m => {
			await m.react('✅');
			await m.react('❌');
			await m.react('❓');
		})
			.catch(err => {
				channels.errors.send('Unknown error in send.js', err);
			});
	},
};