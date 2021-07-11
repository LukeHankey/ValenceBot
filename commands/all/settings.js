/* eslint-disable quotes */
/* eslint-disable no-inline-comments */
const { cyan, red_dark } = require('../../colors.json');
const getDb = require('../../mongodb').getDb;
const { nEmbed, checkNum } = require('../../functions.js');

module.exports = {
	name: 'settings',
	description: ['Displays the settings that you can change.', 'Shows the current prefix.', 'Sets the new prefix in the server.', 'Shows the current admin role.', 'Sets the new admin role in the server.', 'Shows the current mod role.', 'Sets the new mod role in the server.', 'Shows the current admin channel.', 'Sets the current admin channel.'],
	aliases: ['s'],
	usage: ['', 'prefix', 'prefix set <new prefix>', 'adminRole', 'adminRole set <new role>', 'modRole', 'modRole set <new role>', 'adminChannel', 'adminChannel set <channel>'],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	run: async (client, message, args, perms, channels) => {
		if (!perms.admin) return message.channel.send(perms.errorA);
		const db = getDb();
		const settings = db.collection('Settings');
		const { prefix, roles: { modRole, adminRole }, channels: { adminChannel, events, mod } } = await settings.findOne({ _id: message.guild.id }, { projection: { prefix: 1, roles: 1, channels: 1 } });
		const [...rName] = args.slice(2);
		const roleName = message.guild.roles.cache.find(role => role.name === rName.join(' '));
		const channelTag = [];

		switch (args[0]) {
		case 'prefix':
			switch (args[1]) {
			case 'set':
				args[2]
					? settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { prefix: args[2] } }, { returnOriginal: true })
						.then(r => {
							message.channel.send(`Prefix has been changed from \`${r.value.prefix}\` to \`${args[2]}\``);
							channels.logs.send(`<@${message.author.id}> changed the bot Prefix in server: **${message.guild.name}**\n\`\`\`diff\n- ${r.value.prefix}\n+ ${args[2]}\`\`\``);
						})
						.catch(err => {
							channels.errors.send('Unknown error in settings.js', `\`\`\`${err}\`\`\``);
						})
					: message.channel.send('What do you want to set the prefix to?');
				break;
			default:
				if (!args[1]) {
					message.channel.send(`Your prefix is set as: \`${prefix}\``);
				}
			}
			break;
		case 'adminRole':
			switch (args[1]) {
			case 'set':
				if (checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2] && message.guild.roles.cache.get(`${args[2]}`).permissions.has('ADMINISTRATOR')) { // Setting role by ID
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.adminRole': `<@&${args[2]}>` } }, { returnOriginal: true });
					message.channel.send(`The Admin Role has been changed to: <@&${args[2]}>`, { 'allowedMentions': { 'parse': [] } });
					channels.logs.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.adminRole}\n+ <@&${args[2]}>\`\`\``);
				}
				else if (roleName && message.guild.roles.cache.get(roleName.id).permissions.has('ADMINISTRATOR')) { // Setting role by name
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.adminRole': `<@&${roleName.id}>` } }, { returnOriginal: true });
					message.channel.send(`The Admin Role has been changed to: <@&${roleName.id}>`, { 'allowedMentions': { 'parse': [] } });
					channels.logs.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.adminRole}\n+ ${roleName.id}\`\`\``);
				}
				else if (message.mentions.roles.first() && message.guild.roles.cache.get(message.mentions.roles.first().id).permissions.has('ADMINISTRATOR')) { // Setting role by mention
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.adminRole': args[2] } }, { returnOriginal: true });
					message.channel.send(`The Admin Role has been changed to: ${args[2]}`, { 'allowedMentions': { 'parse': [] } });
					channels.logs.send(`<@${message.author.id}> changed the adminRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.adminRole}\n+ ${args[2]}\`\`\``);
				}
				else {
					message.channel.send('What do you want to set the Admin Role to? Acceptable values:');
					message.channel.send(`\`\`\`diff\n+ Role ID\n+ Tagging the role\n+ Role Name\n\nNOTE:\n- If specifying a Role Name, make sure the Role Name is unique!\n- All roles must have the ADMINISTRATOR permission set.\`\`\``);
				}
				break;
			default:
				if (!args[1]) {
					message.channel.send(`Your Admin Role is set as: ${adminRole}`, { 'allowedMentions': { 'parse': [] } });
				}
			}
			break;
		case 'modRole':
			switch (args[1]) {
			case 'set':
				if (checkNum(args[2], 1, Infinity) && message.guild.roles.cache.has(args[2]) && message.guild.id !== args[2] && message.guild.roles.cache.get(`${args[2]}`).permissions.has(['KICK_MEMBERS', 'BAN_MEMBERS'])) { // Setting role by ID
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.modRole': `<@&${args[2]}>` } }, { returnOriginal: true });
					message.channel.send(`The Mod Role has been changed to: <@&${args[2]}>`, { 'allowedMentions': { 'parse': [] } });
					channels.logs.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.modRole}\n+ <@&${args[2]}>\`\`\``);
				}
				else if (roleName && message.guild.roles.cache.get(roleName.id).permissions.has(['KICK_MEMBERS', 'BAN_MEMBERS'])) { // Setting role by name
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.modRole': `<@&${roleName.id}>` } }, { returnOriginal: true });
					message.channel.send(`The Mod Role has been changed to: <@&${roleName.id}>`, { 'allowedMentions': { 'parse': [] } });
					channels.logs.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.modRole}\n+ ${roleName}\`\`\``);
				}
				else if (message.mentions.roles.first() && message.guild.roles.cache.get(message.mentions.roles.first().id).permissions.has(['KICK_MEMBERS', 'BAN_MEMBERS'])) { // Setting role by mention
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'roles.modRole': args[2] } }, { returnOriginal: true });
					message.channel.send(`The Mod Role has been changed to: ${args[2]}`, { 'allowedMentions': { 'parse': [] } });
					channels.logs.send(`<@${message.author.id}> changed the modRole in server: **${message.guild.name}**\n\`\`\`diff\n- ${found.value.roles.modRole}\n+ ${args[2]}\`\`\``);
				}
				else {
					message.channel.send('What do you want to set the Mod Role to? Acceptable values:');
					message.channel.send(`\`\`\`diff\n+ Role ID\n+ Tagging the role\n+ Role Name\n\nNOTE:\n- If specifying a Role Name, make sure the Role Name is unique!\n- All roles must have the KICK_MEMBERS & BAN_MEMBERS permission set.\`\`\``);
				}
				break;
			default:
				if (!args[1]) {
					message.channel.send(`Your Mod Role is set as: ${modRole}`, { 'allowedMentions': { 'parse': [] } });
				}
			}
			break;
		case 'adminChannel':
			switch (args[1]) {
			case 'set':
				if (args[2] === undefined) {
					channelTag.push('false');
				}
				else {
					channelTag.push(args[2].slice(2, 20));
				}
				if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2]) && message.guild.id !== args[2]) { // Check by ID
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.adminChannel': args[2] } }, { returnOriginal: true });
					message.channel.send(`The Admin Channel has been set to: <#${args[2]}>`);
					channels.logs.send(`<@${message.author.id}> set the Admin Channel in server: **${message.guild.name}** from <#${found.value.channels.adminChannel}> to <#${args[2]}>`);
				}
				else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) { // Check by #Channel
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.adminChannel': channelTag[0] } }, { returnOriginal: true });
					message.channel.send(`The Admin Channel has been set to: <#${channelTag[0]}>`);
					channels.logs.send(`<@${message.author.id}> set the Admin Channel in server: **${message.guild.name}** from <#${found.value.channels.adminChannel}> to <#${channelTag[0]}>`);
				}
				else {
					message.channel.send('What do you want to set the Admin Channel to? Acceptable values:');
					message.channel.send(`\`\`\`diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)\`\`\``);
				}
				break;
			default:
				if (!args[1]) {
					adminChannel === null
						? message.channel.send('Your Admin Channel is set as: `Null`')
						: message.channel.send(`Your Admin Channel is set as: <#${adminChannel}>`);
				}
				else {
					message.channel.send(nEmbed('Permission Denied', 'You do not have permission to see the Admin Channel!', red_dark));
				}
			}
			break;
		case 'eventsChannel':
			switch (args[1]) {
			case 'set':
				if (args[2] === undefined) {
					channelTag.push('false');
				}
				else {
					channelTag.push(args[2].slice(2, 20));
				}
				if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2]) && message.guild.id !== args[2]) { // Check by ID
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.events': args[2] } }, { returnOriginal: true });
					message.channel.send(`The Events Channel has been set to: <#${args[2]}>`);
					channels.logs.send(`<@${message.author.id}> set the Events Channel in server: **${message.guild.name}** from <#${found.value.channels.events}> to <#${args[2]}>`);
				}
				else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) { // Check by #Channel
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.events': channelTag[0] } }, { returnOriginal: true });
					message.channel.send(`The Events Channel has been set to: <#${channelTag[0]}>`);
					channels.logs.send(`<@${message.author.id}> set the Events Channel in server: **${message.guild.name}** from <#${found.value.channels.events}> to <#${channelTag[0]}>`);
				}
				else {
					message.channel.send('What do you want to set the Events Channel to? Acceptable values:');
					message.channel.send(`\`\`\`diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)\`\`\``);
				}
				break;
			default:
				if (!args[1]) {
					events === null || events === undefined
						? message.channel.send('Your events Channel is set as: `Null`')
						: message.channel.send(`Your events Channel is set as: <#${events}>`);
				}
				else {
					message.channel.send(nEmbed('Permission Denied', 'You do not have permission to see the Admin Channel!', red_dark));
				}
			}
			break;
		case 'modChannel':
			switch (args[1]) {
			case 'set':
				if (args[2] === undefined) {
					channelTag.push('false');
				}
				else {
					channelTag.push(args[2].slice(2, 20));
				}
				if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2]) && message.guild.id !== args[2]) { // Check by ID
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.mod': args[2] } }, { returnOriginal: true });
					message.channel.send(`The Mod Channel has been set to: <#${args[2]}>`);
					channels.logs.send(`<@${message.author.id}> set the Mod Channel in server: **${message.guild.name}** from <#${found.value.channels.mod}> to <#${args[2]}>`);
				}
				else if (checkNum(channelTag[0], 1, Infinity) && message.guild.channels.cache.has(channelTag[0])) { // Check by #Channel
					const found = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'channels.mod': channelTag[0] } }, { returnOriginal: true });
					message.channel.send(`The Mod Channel has been set to: <#${channelTag[0]}>`);
					channels.logs.send(`<@${message.author.id}> set the Mod Channel in server: **${message.guild.name}** from <#${found.value.channels.mod}> to <#${channelTag[0]}>`);
				}
				else {
					message.channel.send('What do you want to set the Mod Channel to? Acceptable values:');
					message.channel.send(`\`\`\`diff\n+ Channel ID (18 Digits)\n+ Channel tag (#<Channel name>)\`\`\``);
				}
				break;
			default:
				if (!args[1]) {
					mod === null || mod === undefined
						? message.channel.send('Your Mod Channel is set as: `Null`')
						: message.channel.send(`Your Mod Channel is set as: <#${mod}>`);
				}
				else {
					message.channel.send(nEmbed('Permission Denied', 'You do not have permission to see the Admin Channel!', red_dark));
				}
			}
			break;
		default:
			if (!args[0]) {
				message.channel.send(nEmbed(
					'**Settings List**',
					'Here\'s a list of all the settings you can change:',
					cyan,
					client.user.displayAvatarURL(),
				)
					.addFields(
						{ name: '**Settings**', value: '`prefix`\n`adminRole`\n`modRole`\n`adminChannel`\n`eventsChannel`\n`modChannel`', inline: false },
					));
			}
			else {
				return;
			}
		}
	},
};