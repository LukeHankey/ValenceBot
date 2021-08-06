/* eslint-disable no-unused-vars */
/* eslint-disable no-inline-comments */
const getDb = require('../../mongodb').getDb;
const colors = require('../../colors.json');
const { Permissions } = require('../../classes.js');
const { MessageEmbed } = require('discord.js');
const { vEvents } = require('../../valence/valenceEvents');
const { dsf } = require('../../dsf/merch/main');

module.exports = async (client, message) => {
	const db = getDb();
	const settingsColl = await db.collection('Settings');
	const { channels: { vis, errors, logs } } = await settingsColl.findOne({ _id: 'Globals' }, { projection: { channels: { vis: 1, errors: 1, logs: 1 } } });

	if (process.env.NODE_ENV === 'DEV') {
		const devGuild = client.guilds.cache.get('668330890790699079');
		if (devGuild.id !== message.channel.guild.id) return;
	}

	const channels = {
		vis: {
			id: vis,
			// content could be both embed or content
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send(content);
			},
		},
		errors: {
			id: errors,
			embed: function(err, module) {
				const fileName = module.id.split('\\').pop();
				const embed = new MessageEmbed()
					.setTitle(`An error occured in ${fileName}`)
					.setColor(colors.red_dark)
					.addField(`${err.message}`, `\`\`\`${err.stack}\`\`\``);
				return embed;
			},
			send: function(...args) {
				const channel = client.channels.cache.get(this.id);
				return channel.send({ embeds: [ this.embed(...args) ] });
			},
		},
		logs: {
			id: logs,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send({ content });
			},
		},
	};

	// Handling DMs
	if (message.channel.guild === null) {
		const dm = message.channel;
		let dmMessages = await dm.messages.fetch({ limit: 1 });
		const dmPerson = dm.recipient; // User object
		const dmMsg = [];
		dmMessages = [...dmMessages.values()];

		for (const val in dmMessages) {
			if (dmMessages[val].author.id === '668330399033851924') return;
			dmMsg.push(dmMessages[val].content);
		}

		const embed = new MessageEmbed()
			.setTitle('New DM Recieved')
			.setDescription(`${dmPerson.tag} sent me a DM.`)
			.setColor(colors.blue_dark)
			.addField('User ID', `${dmPerson.id}`, false)
			.addField('Message contents', `${dmMsg.join('\n')}`)
			.setTimestamp();

		return client.channels.cache.get('788525524782940187').send({ embeds: [ embed ] });
	}

	// Deep Sea Fishing
	if (message.channel.guild.id === '420803245758480405' || message.channel.guild.id === '733164313744769024') {
		const { merchChannel: { channelID, otherChannelID } } = await settingsColl.findOne({ _id: message.channel.guild.id, merchChannel: { $exists: true } }, { projection: { 'merchChannel.channelID': 1, 'merchChannel.otherChannelID': 1 } });
		// Merch Posts Publish
		if (message.channel.id === '770307127557357648') {
			if (message.author.bot && message.crosspostable) {
				message.crosspost();
			}
		}
		if (message.channel.id === channelID || message.channel.id === otherChannelID) {
			// DSF - Merch Calls
			return await dsf(client, message, channels);
		}
	}

	if (message.author.bot) return;

	// Valence Events Channel
	if (message.channel.guild.id === '472448603642920973' || message.channel.guild.id === '733164313744769024') {
		// Valence - Filter
		const filterWords = ['retard', 'nigger'];
		const blocked = filterWords.filter(word => {
			return message.content.toLowerCase().includes(word);
		});

		if (blocked.length > 0) message.delete();
		await vEvents(client, message, channels);
	}

	try {
		const commandDB = await settingsColl.findOne({ _id: message.channel.guild.id }, { projection: { prefix: 1, roles: 1 } });
		if (!message.content.startsWith(commandDB.prefix)) return;

		const args = message.content.slice(commandDB.prefix.length).split(/ +/g);
		const commandName = args.shift().toLowerCase();

		const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases
			&& cmd.aliases.includes(commandName)); // Command object

		const aR = new Permissions('adminRole', commandDB, message);
		const mR = new Permissions('modRole', commandDB, message);
		const owner = new Permissions('owner', commandDB, message);

		const perms = {
			owner: owner.botOwner(),
			admin: message.member.roles.cache.has(aR.memberRole()[0]) || message.member.roles.cache.has(aR.roleID) || message.author.id === message.channel.guild.ownerId,
			mod: message.member.roles.cache.has(mR.memberRole()[0]) || message.member.roles.cache.has(mR.roleID) || mR.modPlusRoles() >= mR._role.rawPosition || message.author.id === message.channel.guild.ownerId,
			errorO: owner.ownerError(),
			errorM: mR.error(),
			errorA: aR.error(),
		};

		try {
			command.guildSpecific === 'all' || command.guildSpecific.includes(message.channel.guild.id)
				? command.run(client, message, args, perms, channels)
				: message.channel.send({ content: 'You cannot use that command in this server.' });
		}
		catch (error) {
			if (commandName !== command) return;
		}
	}
	catch (err) {
		console.error(err);
	}
};