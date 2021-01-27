const colors = require('../../colors.json');
const { MessageEmbed } = require('discord.js');

module.exports = {
	name: 'self-assign',
	description: ['Assigns or removes a role.'],
	aliases: ['sa'],
	usage: ['<role name>'],
	guildSpecific: 'all',
	run: async (client, message, args) => {

		const [...roleName] = args;

		const rName = roleName.join(' ').trim();
		let rNameMulti = rName.split(',');
		rNameMulti = rNameMulti.map(x => x.trim().toLowerCase());
		const botRole = message.guild.me.roles.cache.find(r => r.managed);
		const highBotRoleID = botRole.id;

		const role = rNameMulti.map(rN => {
			return message.guild.roles.cache.find(roles => {
				return roles.name.toLowerCase() === rN;
			});
		});

		let pos = role.map((x, i) => {
			if (x === undefined) return i;
		});
		pos = pos.filter(item => !isNaN(parseInt(item)));
		const wrong = pos.map(v => rNameMulti[v]);

		if (!args[0]) {
			return message.channel.send('Please provide the role name(s) to add/remove.');
		}

		const botRoleHighest = message.guild.roles.cache.get(highBotRoleID);
		const botHighest = role.filter(x => {
			if (x === undefined) return;
			return botRoleHighest.position > x.position;
		});

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

		const embed = new MessageEmbed()
			.setTitle('Self-Assigned')
			.setTimestamp()
			.setColor(colors.green_light)
			.setFooter(`${client.user.username} created by Luke_#8346`, message.guild.iconURL());

		const fieldAdd = { name: 'Roles Added:', value: `\`\`\`css\n${!added.length ? 'None' : added[0].join(', ')}\`\`\``, inline: true };
		const fieldRemove = { name: 'Roles Removed:', value: `\`\`\`fix\n${!removed.length ? 'None' : removed[0].join(', ')}\`\`\``, inline: true };
		const wrongAdd = { name: 'Can\'t find:', value: `\`\`\`cs\n'${wrong.join(', ')}'\`\`\``, inline: true };
		const fields = [fieldAdd, fieldRemove];
		const fieldsPlus = [...fields, wrongAdd];

		console.log(added, removed, wrong);

		wrong.length && (!added.length && !removed.length) ? message.channel.send(embed.setColor(colors.red_light).addFields(wrongAdd))
			: wrong.length ? message.channel.send(embed.addFields(fieldsPlus))
				: message.channel.send(embed.addFields(fields));
	},
};