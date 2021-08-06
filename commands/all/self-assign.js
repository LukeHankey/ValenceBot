const colors = require('../../colors.json');
const { MessageEmbed } = require('discord.js');

module.exports = {
	name: 'self-assign',
	description: ['Assigns or removes a role.', 'Shows a full list of self-assignable roles.'],
	aliases: ['sa'],
	usage: ['<role name>', 'roles'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	run: async (client, message, args) => {

		const [...roleName] = args;

		const rName = roleName.join(' ').trim();
		let rNameMulti = rName.split(',');
		rNameMulti = rNameMulti.map(x => x.trim().toLowerCase());
		const botRole = message.channel.guild.me.roles.cache.find(r => r.managed);
		const highBotRoleID = botRole.id;

		const role = rNameMulti.map(rN => {
			return message.channel.guild.roles.cache.find(roles => {
				return roles.name.toLowerCase() === rN;
			});
		});

		let pos = role.map((x, i) => {
			if (x === undefined) return i;
		});
		pos = pos.filter(item => !isNaN(parseInt(item)));
		const wrong = pos.map(v => rNameMulti[v]);

		if (!args[0]) {
			return message.channel.send({ content: 'Please provide the role name(s) to add/remove.' });
		}

		const botRoleHighest = message.channel.guild.roles.cache.get(highBotRoleID);
		const botHighest = role.filter(x => {
			if (x === undefined) return;
			return botRoleHighest.position > x.position;
		});

		const embed = new MessageEmbed()
			.setTitle('Self-Assigned Information')
			.setTimestamp()
			.setColor(colors.green_light)
			.setFooter(`${client.user.username} created by Luke_#8346`, message.channel.guild.iconURL());

		if (args[0] === 'roles') {
			let allAvailableRoles = [];
			message.channel.guild.roles.cache.filter(allRoles => {
				if (allRoles.position < botRoleHighest.position) {
					allAvailableRoles.push(allRoles.name);
				}
			});

			allAvailableRoles = allAvailableRoles
				.filter(name => name !== '@everyone')
				.map(name => `\`${name}\``)
				.sort()
				.join(' | ');

			if (!allAvailableRoles.length) return message.channel.send({ content: 'No roles are assignable as no roles are above my highest role.' });

			return message.channel.send({ embeds: [ embed.setColor(colors.cyan).addField('Available roles to add:', allAvailableRoles) ] });

		}

		const rID = botHighest.map(x => x.id);
		const rNames = botHighest.map(x => x.name);

		const memberRole = message.member.roles;
		const added = [];
		const removed = [];

		rID.forEach(e => {
			memberRole.cache.has(e)
				? memberRole.remove(rID) && removed.push(rNames)
				: memberRole.add(rID) && added.push(rNames);
		});

		const fieldAdd = { name: 'Roles Added:', value: `\`\`\`css\n${!added.length ? 'None' : added[0].join(', ')}\`\`\``, inline: true };
		const fieldRemove = { name: 'Roles Removed:', value: `\`\`\`fix\n${!removed.length ? 'None' : removed[0].join(', ')}\`\`\``, inline: true };
		const wrongAdd = { name: 'Can\'t find:', value: `\`\`\`cs\n'${wrong.join(', ')}'\`\`\``, inline: true };
		const fields = [fieldAdd, fieldRemove];
		const fieldsPlus = [...fields, wrongAdd];

		console.log(added, removed, wrong);

		wrong.length && (!added.length && !removed.length) ? message.channel.send({ embeds: [ embed.setColor(colors.red_light).addFields(wrongAdd).setDescription('Can\'t find the role name? Use `;sa roles` for a full list of self-assignable role names.') ] })
			: wrong.length ? message.channel.send({ embeds: [ embed.addFields(fieldsPlus).setDescription('Can\'t find the role name? Use `;sa roles` for a full list of self-assignable role names.') ] })
				: message.channel.send({ embeds: [ embed.addFields(fields) ] });
	},
};