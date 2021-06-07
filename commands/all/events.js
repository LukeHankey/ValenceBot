const getDb = require('../../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const { cyan } = require('../../colors.json');

/**
 * 733164313744769024 - Test Server
 */

module.exports = {
	name: 'events',
	description: ['List the current events.', 'Ends an event and removes the role.'],
	aliases: ['e'],
	usage:  ['', 'end [ID]'],
	guildSpecific: 'all',
	run: async (client, message, args, perms, channels) => {
		if (!perms.mod) return message.channel.send(perms.errorM);
		const db = getDb();
		const settings = db.collection('Settings');

		const data = await settings.findOne({ _id: message.guild.id }, { projection: { events: 1, 'channels.events': 1, calendarID: 1 } });
		const fetchedChannel = client.channels.cache.get(data.channels.events);

		switch(args[0]) {
		case 'end': {
			const tag = args[1];
			const checkEventExists = data.events.map(event => { if (event.eventTag === tag) return { value: true, message: event.messageID };}).filter(valid => valid);
			if (checkEventExists[0].value) {
				const fetchedMessage = await fetchedChannel.messages.fetch(checkEventExists[0].message).catch((e) => { return channels.errors.send('Unable to fetch message from the event channel when ending an event.', e);});
				fetchedMessage.reactions.removeAll();
				await settings.updateOne({ _id: message.guild.id }, { $pull: { events: { eventTag: tag } } });
				await settings.findOneAndUpdate({ _id: message.guild.id, 'calendarID.month': new Date(fetchedMessage.createdTimestamp).toLocaleString('default', { month: 'long' }) }, { $pull: { 'calendarID.$.events': { messageID: message.id } } });
				return message.react('✅');
			}
			else {
				message.react('❌');
				message.channel.send(`There is no event found with ID: \`${tag}\``);
			}

		}
			break;
		default: {
			// Listing events
			const link = `https://discord.com/channels/${data._id}/${data.channels.events}/`;
			const fieldHolder = data.events.map(obj => {
				const members = obj.members.map(mem => { return `<@!${mem}>`;});
				return { name: obj.title, value: `ID: ${obj.eventTag}\nRole: <@&${obj.roleID}>\n[Event posted ${obj.date ? 'on ' + obj.date.toString().split(' ').slice(0, 4).join(' ') : ''}](${link}${obj.messageID})\nInterested 📌: ${members.join(', ')}` };
			});

			const embed = new MessageEmbed()
				.setTitle('Event Listing')
				.setColor(cyan)
				.setDescription('These are all of the events currently stored. Some may be old ones, others relatively new and ongoing. Feel free to remove events by their event ID.')
				.addFields(fieldHolder);
			message.channel.send(embed);
		}
		}
	},
};
