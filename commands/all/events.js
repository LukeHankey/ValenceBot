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
	permissionLevel: 'Mod',
	run: async (client, message, args, perms, channels) => {
		if (!perms.mod) return message.channel.send(perms.errorM);
		const db = getDb();
		const settings = db.collection('Settings');

		/**
		 * When ending an event, remove from calendar as well.
		 * Going forward, all events will be added to the events and calendar DB. eventTag & messageID shared between them.
		 * Get the entire calendar embed and loop through to find the position of the event with matching messageID
		 * Splice that out and remove from both DBs
		 */

		const data = await settings.findOne({ _id: message.guild.id }, { projection: { events: 1, channels: 1, calendarID: 1 } });
		const fetchedChannel = client.channels.cache.get(data.channels.events);

		switch(args[0]) {
		case 'end': {
			const tag = args[1];
			const checkEventExists = data.events.map(event => { if (event.eventTag === tag) return { value: true, message: event.messageID, role: event.roleID };}).filter(valid => valid);
			if (checkEventExists[0].value) {
				const messageID = checkEventExists[0].message;
				const info = data.calendarID.map(months => {
					if (!months.events || !months.events.length) return;
					const check = months.events.some(elem => elem.messageID === messageID);
					if (check) return { msg: months.messageID, month: months.month };
				}).filter(x => x);
				console.log(info, checkEventExists[0]);

				const calChannel = message.guild.channels.cache.find((ch) => ch.name === 'calendar');
				calChannel.messages.fetch(info[0].msg)
					.then(fetched => {
						const fields = fetched.embeds[0].fields;
						const foundIndex = fields.findIndex(field => {
							let announcement = field.value.split('\n')[2];
							announcement = announcement.split('/')[6].slice(0, -1);
							if (announcement === checkEventExists[0].message) return field;
						});
						let items = fields.find(item => {
							let announcement = item.value.split('\n')[2];
							announcement = announcement.split('/')[6].slice(0, -1);
							if (announcement === checkEventExists[0].message) return item;
						});
						items = [items].map((values) => `${values.name}\n${values.value}\n`);

						const updateEmbed = new MessageEmbed(fetched.embeds[0]);
						updateEmbed.spliceFields(foundIndex, 1);
						fetched.edit(updateEmbed);
						const remaining = updateEmbed.fields.map((values) => `${values.name}\n${values.value}\n`);
						return channels.logs.send(`Calendar updated - ${message.author} removed event: \`\`\`diff\n- Removed\n${items.join('\n')}\n+ Remaining\n ${remaining.join('\n')}\`\`\``);
					});

				const fetchedMessage = await fetchedChannel.messages.fetch(checkEventExists[0].message).catch((e) => { return channels.errors.send('Unable to fetch message from the event channel when ending an event.', e);});
				await settings.updateOne({ _id: message.guild.id }, { $pull: { events: { eventTag: tag } } });
				await settings.findOneAndUpdate({ _id: message.guild.id, 'calendarID.month': new Date(fetchedMessage.createdTimestamp).toLocaleString('default', { month: 'long' }) }, { $pull: { 'calendarID.$.events': { messageID: checkEventExists[0].message } } });
				await message.guild.roles.fetch(checkEventExists[0].role).then(r => r.delete());
				fetchedMessage.reactions.removeAll();
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
