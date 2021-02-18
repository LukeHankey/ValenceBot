module.exports = {
	name: 'ping',
	description: 'Ping.',
	aliases: [''],
	guildSpecific: ['733164313744769024'],
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorO);

		const m = await message.channel.send('Pinging...');
		const ping = m.createdTimestamp - message.createdTimestamp;
		m.edit(`Latency is ${ping}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
	},

};