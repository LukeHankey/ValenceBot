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
		database.updateOne({ _id: message.guild.id }, {
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
	removeEvents: async function(client, message, settings, channels, database, identifier, messageCheck) {
		const eventsChannel = client.channels.cache.get(database.channels.events);
		let eventMessageCheck;

		if (identifier === 'eventTag') {
			eventMessageCheck = database.events.map(event => { if (event.eventTag === messageCheck) return { value: true, message: event.messageID, role: event.roleID };}).filter(valid => valid);
			const eventMessage = await eventsChannel.messages.fetch(eventMessageCheck[0].message).catch((e) => { return channels.errors.send('Unable to fetch message from the event channel when ending an event.', e);});
			await settings.updateOne({ _id: message.guild.id }, { $pull: { events: { eventTag: messageCheck } } });
			await settings.findOneAndUpdate({ _id: message.guild.id, 'calendarID.month': new Date(eventMessage.createdTimestamp).toLocaleString('default', { month: 'long' }) }, { $pull: { 'calendarID.$.events': { eventTag: messageCheck } } });
			eventMessage.reactions.removeAll();
		}
		else if (identifier === 'messageID') {
			eventMessageCheck = database.events.map(event => { if (event.messageID === messageCheck) return { message: event.messageID, role: event.roleID };}).filter(valid => valid);
			const eventMessage = await eventsChannel.messages.fetch(messageCheck);
			await settings.updateOne({ _id: message.guild.id }, { $pull: { events: { messageID: messageCheck } } });
			await settings.findOneAndUpdate({ _id: message.guild.id, 'calendarID.month': new Date(eventMessage.createdTimestamp).toLocaleString('default', { month: 'long' }) }, { $pull: { 'calendarID.$.events': { messageID: messageCheck } } });
			eventMessage.reactions.removeAll();
		}
		else { return;}

		await message.guild.roles.fetch(eventMessageCheck[0].role).then(r => r.delete());

		const messageID = eventMessageCheck[0].message;
		const info = database.calendarID.map(months => {
			if (!months.events || !months.events.length) return;
			const check = months.events.some(elem => elem.messageID === messageID);
			if (check) return { msg: months.messageID, month: months.month };
		}).filter(x => x);

		const calChannel = message.guild.channels.cache.find((ch) => ch.name === 'calendar');
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
			if (announcement === messageID) return item;
		});
		items = [items].map((values) => `${values.name}\n${values.value}\n`);

		const updateEmbed = new MessageEmbed(calMessage.embeds[0]);
		updateEmbed.spliceFields(foundIndex, 1);
		calMessage.edit(updateEmbed);
		const remaining = updateEmbed.fields.map((values) => `${values.name}\n${values.value}\n`);
		channels.logs.send(`Calendar updated - ${message.author} removed event: \`\`\`diff\n- Removed\n${items.join('\n')}\n+ Remaining\n ${remaining.join('\n')}\`\`\``);
	},
};