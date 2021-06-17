/* eslint-disable no-inline-comments */
const getDb = require('../../mongodb').getDb;
const colors = require('../../colors.json');
const { Permissions } = require('../../classes.js');
const { MessageEmbed } = require('discord.js');
const { vEvents } = require('../../valenceEvents');
const { dsf } = require('../../dsf/main');

module.exports = async (client, message) => {
	const db = getDb();
	const settingsColl = await db.collection('Settings');
	const { channels: { vis, errors, logs } } = await settingsColl.findOne({ _id: 'Globals' }, { projection: { channels: { vis: 1, errors: 1, logs: 1 } } });

	const channels = {
		vis: {
			id: vis,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send(content);
			},
		},
		errors: {
			id: errors,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send(content);
			},
		},
		logs: {
			id: logs,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send(content);
			},
		},
	};

	// Handling DMs
	if (message.guild === null) {
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

		return client.channels.cache.get('788525524782940187').send(embed);
	}

	if (process.env.NODE_ENV === 'DEV') {
		if (message.guild.id !== '733164313744769024') return;
	}
	else if (message.guild.id === '733164313744769024') {return;}

	// Deep Sea Fishing
	if (message.guild.id === '420803245758480405' || message.guild.id === '733164313744769024') {
		const { merchChannel: { channelID } } = await settingsColl.findOne({ _id: message.guild.id, merchChannel: { $exists: true } }, { projection: { 'merchChannel.channelID': 1 } });
		// Merch Posts Publish
		if (message.channel.id === '770307127557357648') {
			if (message.author.bot) {
				message.crosspost();
			}
		}
		if (message.channel.id === channelID) {
			// DSF - Merch Calls
			await dsf(client, message);
		}
	}

	if (message.author.bot) return;

	// Valence Events Channel
	if (message.guild.id === '472448603642920973' || message.guild.id === '733164313744769024') {
		// Valence - Filter
		const filterWords = ['retard', 'nigger'];
		const blocked = filterWords.filter(word => {
			return message.content.toLowerCase().includes(word);
		});

		if (blocked.length > 0) message.delete();
		await vEvents(client, message, channels);
	}

	// Commands
	try {
		const commandDB = await settingsColl.findOne({ _id: message.guild.id }, { projection: { prefix: 1, roles: 1 } });
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
			admin: message.member.roles.cache.has(aR.memberRole()[0]) || message.member.roles.cache.has(aR.roleID) || message.author.id === message.guild.ownerID,
			mod: message.member.roles.cache.has(mR.memberRole()[0]) || message.member.roles.cache.has(mR.roleID) || mR.modPlusRoles() >= mR._role.rawPosition || message.author.id === message.guild.ownerID,
			errorO: owner.ownerError(),
			errorM: mR.error(),
			errorA: aR.error(),
		};

		try {
			command.guildSpecific === 'all' || command.guildSpecific.includes(message.guild.id)
				? command.run(client, message, args, perms, channels)
				: message.channel.send('You cannot use that command in this server.');
		}
		catch (error) {
			if (commandName !== command) return;
		}
	}
	catch (err) {
		console.error(err);
	}
};