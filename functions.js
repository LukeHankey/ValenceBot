const { MessageEmbed } = require('discord.js');
const colors = require('./colors.json');
const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;
const minute = 60 * 1000;

module.exports = {
	nEmbed: function(title, description, color = colors.cyan, thumbnail = '', guildIcon) {
		const embed = new MessageEmbed()
			.setTitle(title)
			.setDescription(description)
			.setColor(color)
			.setThumbnail(thumbnail)
			.setTimestamp()
			.setFooter('Valence Bot created by Luke_#8346', guildIcon);
		return embed;
	},
	checkNum: function(id = 0, gr_eq = 1, l_eq = Infinity) {
		if (+id !== parseInt(id) || !(id >= gr_eq) || !(id <= l_eq)) {
			return false;
		}
		else {
			return true;
		}
	},
	checkDate: function(id = 0, gr_eq = 0, l_eq = Infinity) {
		if (+id !== parseInt(id) || !(id >= gr_eq) || !(id <= l_eq)) {
			return false;
		}
		else {
			return true;
		}
	},
	msCalc: function(d, h, m) {
		const msDay = d * day;
		const msHour = h * hour;
		const msMin = m * minute;
		return msDay + msHour + msMin;
	},
	doubleDigits: function(digit) {
		if (digit.length === 2) {
			return digit;
		}
		else {
			const zero = '0';
			return zero.concat(digit);
		}
	},
	nextDay: function(d) {
		const now = new Date();
		now.setDate(now.getUTCDate() + (d + (7 - now.getUTCDay())) % 7);
		return now;
	},
	newDates: function(days, hours, minutes, timer) {
		const time = this.msCalc(days, this.doubleDigits(hours), this.doubleDigits(minutes)) + timer;
		return new Date(time).toUTCString();
	},
	capitalise: function(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	},
	removeMessage: async function(message, reactMessage, database) {
		database.updateOne({ _id: message.channel.guild.id }, {
			$pull: {
				'merchChannel.spamProtection': { messageID: reactMessage.id },
			},
		});
	},
	compressArray: function(original) {

		const compressed = [];
		// make a copy of the input array
		const copy = original.slice(0);

		// first loop goes over every element
		for (let i = 0; i < original.length; i++) {

			let myCount = 0;
			// loop over every element in the copy and see if it's the same
			for (let w = 0; w < copy.length; w++) {
				if (original[i] == copy[w]) {
					// increase amount of times duplicate is found
					myCount++;
					// sets item to undefined
					delete copy[w].id;
				}
			}

			if (myCount > 0) {
				const a = new Object();
				a.value = original[i];
				a.count = myCount;
				compressed.push(a);
			}
		}

		return compressed;
	},
	randomNum: function() {
		return (Math.round(Math.random() * 10000) + 1);
	},
	removeEvents: async function(client, message, settings, { channels, module }, database, identifier, messageCheck) {
		const eventsChannel = client.channels.cache.get(database.channels.events);
		let eventMessageCheck;

		if (identifier === 'eventTag') {
			eventMessageCheck = database.events.map(event => { if (event.eventTag === messageCheck) return { value: true, message: event.messageID, role: event.roleID };}).filter(valid => valid);
			const eventMessage = await eventsChannel.messages.fetch(eventMessageCheck[0].message).catch((e) => { return channels.errors.send(e, module);});
			await settings.updateOne({ _id: message.channel.guild.id }, { $pull: { events: { eventTag: messageCheck } } });
			await settings.findOneAndUpdate({ _id: message.channel.guild.id, 'calendarID.month': new Date(eventMessage.createdTimestamp).toLocaleString('default', { month: 'long' }) }, { $pull: { 'calendarID.$.events': { eventTag: messageCheck } } });
			eventMessage.reactions.removeAll();
		}
		else if (identifier === 'messageID') {
			eventMessageCheck = database.events.map(event => { if (event.messageID === messageCheck) return { message: event.messageID, role: event.roleID };}).filter(valid => valid);

			// Send error to error channel if the post was not made in the events channel (Might have been done directly with commands.
			const eventMessage = await eventsChannel.messages.fetch(messageCheck).catch(e => channels.errors.send(e, module));

			// Remove from events
			await settings.updateOne({ _id: message.guild.id }, { $pull: { events: { roleID: eventMessageCheck[0].role } } });

			// Remove from calendar
			await settings.findOneAndUpdate({ _id: message.guild.id, 'calendarID.month': new Date(eventMessage.createdTimestamp).toLocaleString('default', { month: 'long' }) }, { $pull: { 'calendarID.$.events': { roleID: eventMessageCheck[0].role } } });

			// Remove reactions from event post
			eventMessage.reactions.removeAll();
		}
		else { return;}

		// Remove role from server
		await message.guild.roles.fetch(eventMessageCheck[0].role).then(r => r.delete()).catch(err => channels.errors.send(err, module));

		const messageID = eventMessageCheck[0].message;

		// Returns the event month | msg.id
		const info = database.calendarID.map(months => {
			if (!months.events || !months.events.length) return;
			const check = months.events.some(elem => elem.messageID === messageID);
			if (check) return { msg: months.messageID, month: months.month };
		}).filter(x => x);

		const calChannel = message.guild.channels.cache.find((ch) => ch.name === 'calendar');

		try {
			// Rest is for messageReactionAdd
			const calMessage = await calChannel.messages.fetch(info[0].msg);
			const fields = calMessage.embeds[0].fields;
			const foundIndex = fields.findIndex(field => {
				const announcement = field.value.split('\n')[2];
				const announcementID = announcement.split('/')[6].slice(0, -1);
				if (announcementID === messageID) return field;
			});
			let items = fields.find(item => {
				let announcement = item.value.split('\n')[2];
				announcement = announcement.split('/')[6].slice(0, -1);
				if (announcement === messageID) {return item;}
				else { return null; }
			});
			if (!items) return;
			items = [items].map((values) => {
				if (values === null) return null;
				else return `${values.name}\n${values.value}\n`;
			});

			const updateEmbed = new MessageEmbed(calMessage.embeds[0]);
			updateEmbed.spliceFields(foundIndex, 1);
			calMessage.edit({ embeds: [ updateEmbed ] });
			const remaining = updateEmbed.fields.map((values) => `${values.name}\n${values.value}\n`);
			channels.logs.send(`Calendar updated - ${message.author} removed event: \`\`\`diff\n- Removed\n${items.join('\n')}\n+ Remaining\n ${remaining.join('\n')}\`\`\``);
		}
		catch (err) {
			if (err.code === 10008) {
				channels.errors.send(`The ${info[0].month} calendar was deleted from ${calChannel.toString()}. Unable to fetch that months calendar to remove events but they have been removed from the calendar and events database.`);
			}
			else {
				console.error(err);
			}
		}
	},
	csvJSON: (csv) => {

		const lines = csv.split('\n');
		const result = [];
		const headers = lines[0].split(',');

		for (let i = 1; i < lines.length; i++) {
			const obj = {};
			const currentline = lines[i].split(',');

			for (let j = 0; j < headers.length; j++) {
				obj[headers[j]] = currentline[j];
			}

			result.push(obj);
		}

		// return result; // JavaScript object
		return JSON.parse(JSON.stringify(result));
	},
	renameKeys: (keysMap, object) =>
		Object.keys(object).reduce((acc, key) => ({
			...acc,
			...{ [keysMap[key] || key]: object[key] },
		}),
		{},
		),
	paginate: (data, { author }, text, desc = '') => {
		const embeds = [];
		let k = 24;
		for (let i = 0; i < data.length; i += 24) {
			const current = data.slice(i, k);
			k += 24;
			const info = current;
			const embed = new MessageEmbed()
				.setTitle(`${text} Member Profiles - Top Scouters`)
				.setDescription(`Current tracked stats in this server for the top 24 ${desc} scouters per page.`)
				.setColor(colors.aqua)
				.setThumbnail(author.displayAvatarURL())
				.setTimestamp()
				.addFields(info);
			embeds.push(embed);
		}
		return embeds;
	},
	paginateFollowUP: async (msg, { author }, page, embeds, client) => {
		await msg.react('◀️');
		await msg.react('▶️');

		const react = (reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === author.id;
		const collect = msg.createReactionCollector({ filter: react });

		collect.on('collect', (r, u) => {
			if (r.emoji.name === '▶️') {
				if (page < embeds.length) {
					msg.reactions.resolve('▶️').users.remove(u.id);
					page++;
					if (page === embeds.length) --page;
					msg.edit({ embeds: [ embeds[page].setFooter(`Page ${page + 1} of ${embeds.length} - Something wrong or missing? Let a Moderator+ know!`, client.user.displayAvatarURL()) ] });
				}
				else {return;}
			}
			else if (r.emoji.name === '◀️') {
				if (page !== 0) {
					msg.reactions.resolve('◀️').users.remove(u.id);
					--page;
					msg.edit({ embeds: [ embeds[page].setFooter(`Page ${page + 1} of ${embeds.length} - Something wrong or missing? Let a Moderator+ know!`, client.user.displayAvatarURL()) ] });
				}
				else {msg.reactions.resolve('◀️').users.remove(u.id);}
			}
		});
	},
};