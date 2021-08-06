const colors = require('../../colors.json');
const func = require('../../functions.js');
const getDb = require('../../mongodb').getDb;

module.exports = {
	name: 'help',
	description: ['List all of my commands or info about a specific command.'],
	aliases: ['commands'],
	usage: ['command name'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	run: async (client, message, args, perms) => {
		const { commands } = message.client;
		const db = getDb();
		const settings = db.collection('Settings');
		const { prefix } = await settings.findOne({ _id: message.channel.guild.id }, { projection: { prefix: 1 } });

		if (!args.length) {
			const com = commands.map(command => {
				if (command.guildSpecific.includes(message.channel.guild.id) || command.guildSpecific === 'all') {
					switch (perms) {
					default:
						if (perms.owner) {
							if (command.permissionLevel === 'Owner' || command.permissionLevel === 'Admin' || command.permissionLevel === 'Mod' || command.permissionLevel === 'Everyone') return `\`${command.name}\``;
						}
						else if (perms.admin) {
							if (command.permissionLevel === 'Admin' || command.permissionLevel === 'Mod' || command.permissionLevel === 'Everyone') return `\`${command.name}\``;
						}
						else if (perms.mod) {
							if (command.permissionLevel === 'Mod' || command.permissionLevel === 'Everyone') return `\`${command.name}\``;
						}
						else if (command.permissionLevel === 'Everyone') {return `\`${command.name}\``;}
						else { return;}
					}
				}
			});
			const join = com.filter(x => x).join('|');


			/**
			 * Check if permission level of the user using the command is equal to that of the permission level for each command per guild.
			 */


			message.channel.send({ embeds: [ func.nEmbed(
				'**Help Commands List**',
				'Here\'s a list of all my commands:',
				colors.cyan,
				message.author.displayAvatarURL(),
				client.user.displayAvatarURL(),
			)
				.addFields(
					{ name: '**Commands:**', value: join, inline: false },
					{ name: `**The bot prefix is: ${prefix}**`, value: `\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`, inline: false },
				)],
			});
		}
		else {
			const name = args[0];
			const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
			const otherView = ['Lotto', 'Calendar', 'Profile', 'Dsf', 'Send'];

			const cName = func.capitalise(command.name);
			const fields = [];

			for (let i = 0; i < command.usage.length; i++) {
				if (otherView.includes(cName)) {
					const field = { name: `🔹 ${prefix}${cName} ${command.usage[i] || ''}`, value: `${command.description[i]}`, inline: false };
					fields.push(field);
				}
				else {
					const field = { name: `🔹 ${prefix}${cName} ${command.usage[i] || ''}`, value: `${command.description[i]}`, inline: true };
					fields.push(field);
				}
			}

			message.channel.send({ embeds: [ func.nEmbed(
				`**Command:** ${cName}`,
				`**Aliases:** ${command.aliases.join(', ') || '[NO ALIASES]'}\n**Permission Level:** ${command.permissionLevel}\n**Usage:**`,
				colors.aqua,
				message.member.user.displayAvatarURL(),
				client.user.displayAvatarURL(),
			)
				.addFields(fields)],
			});
		}
	},
};