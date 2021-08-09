const { MessageActionRow, MessageButton } = require('discord.js');

module.exports = {
	name: 'ping',
	description: ['Checks API latency.'],
	aliases: [''],
	guildSpecific: 'all',
	permissionLevel: 'Owner',
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorO);

		const m = await message.channel.send({ content: 'Pinging...' });
		const ping = m.createdTimestamp - message.createdTimestamp;

		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('primary')
					.setLabel('Primary')
					.setStyle('PRIMARY')
					.setEmoji('✉️'),
			);

		m.edit({ content: `Latency is ${ping}ms. API Latency is ${Math.round(client.ws.ping)}ms`, components: [row] });
	},

};