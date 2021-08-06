/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

module.exports = {
	name: 'slash',
	description: ['Deploys slash commands.'],
	aliases: [''],
	usage:  [''],
	guildSpecific: ['668330890790699079' ],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorO);
		if (!client.application?.owner) await client.application?.fetch();

		const commandData = (name) => {
			return client.commands.filter(cmd => cmd.name === name);
		};

		const data = [
			{
				name: 'vis',
				description: commandData('vis').first().description[0],
			},
		];

		await client.application?.commands.set(data);
	},
};
