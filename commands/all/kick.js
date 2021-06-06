/* eslint-disable no-useless-escape */
const { checkNum } = require('../../functions.js');

module.exports = {
	name: 'kick',
	description: ['Kicks a member from the server by ID or mention.'],
	aliases: [''],
	usage:  ['ID/@mention'],
	guildSpecific: 'all',
	run: async (client, message, args, perms) => {
		if (!perms.mod) return message.channel.send(perms.errorM);

		const memberToKick = args[0];
		const executor = message.member.nickname || message.author.username;
		let [...reason] = args.slice(1);
		reason.splice(0, 0, `Kicked by: ${executor} - `);
		reason = reason.join(' ');
		const mentionedMember = message.mentions.members.first();
		const authorHighestRole = message.member.roles.highest.rawPosition;

		const permissionCheck = () => {
			// Owner check
			if (message.guild.ownerID === memberToKick) return true;
			// Kicking self by ID
			if (message.author.id === memberToKick) return true;
			// Kicking owner by Tag
			if (message.guild.ownerID === mentionedMember.id) return true;
			// Kicking self by Tag
			if (message.author.id === mentionedMember.id) return true;
		};

		if (!message.guild.me.hasPermission('KICK_MEMBERS')) return message.channel.send('I do not have permission to kick members from this server. I require \`KICK_MEMBERS\` permission.');
		if (permissionCheck()) return message.react('❌');

		if (checkNum(memberToKick, 1, Infinity)) {
			if (message.guild.members.cache.has(memberToKick)) {
				const memberObj = message.guild.members.cache.get(memberToKick);
				if (memberObj.roles.highest.rawPosition > authorHighestRole) return message.react('❌');
				if (reason) memberObj.kick(reason);
				else memberObj.kick();
				return message.react('✅');
			}
			else {
				try {
					const fetchMember = await message.guild.members.fetch(memberToKick);
					if (fetchMember.roles.highest.rawPosition > authorHighestRole) return message.react('❌');
					if (reason) fetchMember.kick(reason);
					else fetchMember.kick();
					return message.react('✅');
				}
				catch (e) {
					if (e.code === 10013) {
						return message.channel.send(`There is no member in this server with ID: ${memberToKick}.`);
					}
				}
			}
		}
		else if (message.mentions.members.first()) {
			if (reason) mentionedMember.kick(reason);
			else mentionedMember.kick();
			return message.react('✅');
		}
		else { return;}
	},
};
