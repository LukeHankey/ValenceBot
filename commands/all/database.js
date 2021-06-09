const getDb = require('../../mongodb').getDb;

/**
 * 668330890790699079 - Valence Bot Server
 * 733164313744769024 - Test Server
 */

module.exports = {
	name: 'db',
	description: ['Looks stuff up in the database'],
	aliases: [''],
	usage:  ['<code>'],
	guildSpecific: ['668330890790699079', '733164313744769024' ],
	permissionLevel: 'Owner',
	run: async (client, message, args, perms) => {
		if (!perms.owner) return message.channel.send(perms.errorO);

		const db = getDb();
		const settingsColl = await db.collection('Settings');

		const [identifier, project] = args;
		if (!identifier) return message.channel.send('Make sure there is an identifier.');
		if (identifier === 'all') {
			const info = await settingsColl.find({}).toArray();
			const IDs = info.map(data => {return `${data._id} - ${data.serverName}`;});
			return message.channel.send(`\`\`\`diff\n- All server IDs\n\n+ ${IDs.join('\n+ ')}\`\`\``);
		}

		let result;

		switch (project) {
		case 'serverName':
			result = await settingsColl.findOne({ _id: identifier }, { projection: { serverName: 1 } });
			message.channel.send(`\`\`\`diff\n- ${result._id}\n\n+ ${result.serverName}\`\`\``);
			break;
		case 'prefix':
			result = await settingsColl.findOne({ _id: identifier }, { projection: { prefix: 1 } });
			message.channel.send(`\`\`\`diff\n- ${result._id}\n\n+ ${result.prefix}\`\`\``);
			break;
		case 'roles': {
			result = await settingsColl.findOne({ _id: identifier }, { projection: { roles: 1 } });
			let roles = Object.entries(result.roles);
			roles = roles.map(([role, id]) => { return `${role} - ${id}`;});
			message.channel.send(`\`\`\`diff\n- ${result._id}\n\n+ ${roles.join('\n+ ')}\`\`\``);
		}
			break;
		case 'channels': {
			result = await settingsColl.findOne({ _id: identifier }, { projection: { channels: 1 } });
			let channels = Object.entries(result.channels);
			channels = channels.map(([ch, id]) => { return `${ch} - ${id}`;});
			message.channel.send(`\`\`\`diff\n- ${result._id}\n\n+ ${channels.join('\n+ ')}\`\`\``);
		}
			break;
		}
	},
};
