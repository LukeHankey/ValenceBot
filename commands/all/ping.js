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

		m.edit({ content: `Latency is ${ping}ms. API Latency is ${Math.round(client.ws.ping)}ms` });
	},

};