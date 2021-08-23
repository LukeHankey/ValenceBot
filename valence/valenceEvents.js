const getDb = require('../mongodb').getDb;
const { MessageEmbed } = require('discord.js');
const { randomNum } = require('../functions');

const vEvents = async (client, message, channels) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const DB = await settingsColl.findOne({ _id: message.channel.guild.id, 'channels.events': { $exists: true } }, { projection: { channels: 1, calendarID: 1 } });

	// eslint-disable-next-line no-useless-escape
	if (!DB) return;
	const eventChannel = DB.channels.events;

	const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const monthIndex = (new Date()).getUTCMonth();

	if (message.channel.id === eventChannel) {
		const last = message.channel.lastMessage;
		const eventTitle = last.content.split('\n').map(e => {
			if (e.includes('*')) {
				return e.replace(/\*|_/g, '');
			}
			return e;
		});
		await last.react('❌');
		await last.react('✅');

		try {
			const filter = (reaction, user) => ['❌', '✅'].includes(reaction.emoji.name) && user.id === message.author.id;
			const collectOne = await message.awaitReactions({ filter, max: 1, time: 300000, errors: ['time'] });
			const collectOneReaction = collectOne.first();

			if (collectOneReaction.emoji.name === '❌') {
				return collectOneReaction.message.reactions.removeAll();
			}
			else if (collectOneReaction.emoji.name === '✅') {
				const newRole = await message.channel.guild.roles.create({
					name: eventTitle[0].concat(` #${randomNum()}`),
				});

				const calChannel = message.channel.guild.channels.cache.find((ch) => ch.name === 'calendar');
				const dateRegex = /^(Date(:)?\s)+((3[0-1]|2\d|1\d|[1-9])(st|nd|rd|th)?)+\s?((-|to)+\s?((3[0-1]|2\d|1\d|[1-9])(st|nd|rd|th)?)+)?(\s)?$/im;
				const timeRegex = /^(Time(:)?\s)+(([1-6]+(\s)?(day(s)?|week(s)?|month(s)?)(\s)?$)?|(([0-1]\d|2[0-3]):([0-5]\d)\s?)?((-|to)+\s?(([0-1]\d|2[0-3]):([0-5]\d))?)?)$/im;
				const link = `https://discord.com/channels/${last.guild.id}/${last.channel.id}/${last.id}`;
				const thisCal = await DB.calendarID.filter(prop => (prop.year === new Date().getUTCFullYear()) && prop.month === months[monthIndex]);
				const m = await calChannel.messages.fetch(thisCal[0].messageID);
				let dateR, timeR;

				dateRegex.exec(last.content) === null ? dateR = 'null' : dateR = dateRegex.exec(last.content)[0];
				timeRegex.exec(last.content) === null ? timeR = 'null' : timeR = timeRegex.exec(last.content)[0];

				const addToCal = async (date, time) => {
					if (date !== 'null') {
						date[4] === ':' ? date = date.slice(6).trim() : date = date.slice(5).trim();
					}
					if (time !== 'null') {
						time[4] === ':' ? time = time.slice(6).trim() : time = time.slice(5).trim();
					}
					if (time === 'null' || date === 'null') {
						if (time === 'null' && date === 'null') {
							client.channels.cache.get(DB.channels.mod).send({ content: `${last.author}, there was an error with both the  \`Time\` and \`Date\` parameters and they have been set as null. Please go update the calendar for your event.` });
						}
						else {
							// eslint-disable-next-line no-useless-escape
							client.channels.cache.get(DB.channels.mod).send({ content: `${last.author}, ${time === 'null' ? 'there was an error with the  \`Time\` parameter and it has been set as null. Please go update the calendar for your event.' : 'there was an error with the  \`Date\` parameter and it has been set as null. Please go update the calendar for your event.'}` });
						}
					}

					const editEmbed = new MessageEmbed(m.embeds[0]);
					editEmbed.addFields(
						{ name: date, value: `Event: ${eventTitle[0]}\nTime: ${time}\n[Announcement](${link})\nHost: ${last.author}` },
					);
					m.edit({ embeds: [ editEmbed ] });
					channels.logs.send(`Calendar updated - ${message.author} added an event automatically: \`\`\`Date: ${date}, Event: ${eventTitle[0]}, Time: ${time}, Link: ${link}, Host: ${last.author}\`\`\``);
				};

				if (!dateRegex.test(last.content) || !timeRegex.test(last.content)) {
					dateRegex.test(last.content) ? addToCal(dateR, timeR) : addToCal(dateR, timeR);
				}
				else {
					addToCal(dateR, timeR);
				}

				await settingsColl.updateOne({ _id: message.channel.guild.id }, { $push: { events: { $each: [ { title: eventTitle[0], messageID: last.id, roleID: newRole.id, eventTag: newRole.name.slice(eventTitle[0].length + 2), date: new Date(), dateEnd: dateR, members: [] } ] } } });
				await settingsColl.findOneAndUpdate({ _id: message.channel.guild.id, 'calendarID.month': new Date().toLocaleString('default', { month: 'long' }) }, { $push: { 'calendarID.$.events': { messageID: last.id, title: eventTitle[0], eventTag: newRole.name.slice(eventTitle[0].length + 2), roleID: newRole.id } } });
				await collectOneReaction.message.reactions.removeAll();
				await last.react('📌');
				await last.react('✅');
			}
			else {return;}
		}
		catch (err) {
			console.log(err);
			if (err.code === 500035) {
				message.channel.guild.channels.cache.get(DB.channels.mod).send({ content: `${message.member} reacted with ✅ but the Event Title (1st line) is too long. Max of 100 characters.` });
			}
		}
	}
};

module.exports = {
	vEvents,
};
