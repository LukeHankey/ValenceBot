const Discord = require('discord.js');
const colors = require('./colors.json');
const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;
const minute = 60 * 1000;

module.exports = {
	nEmbed: function(title, description, color = colors.cyan, thumbnail = '', guildIcon) {
		const embed = new Discord.MessageEmbed()
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
	removeUsersAndMessages: async function(message, member, database) {
		if (member.member.id !== null) {
			await database.findOneAndUpdate({ _id: message.guild.id, 'merchChannel.spamProtection.messageID': member.msg }, {
				$pull: {
					'merchChannel.spamProtection.$.users': { id: member.member.id },
				},
			});
		}
		const removeMessages = async () => {
			const db = await database.findOne({ _id: message.guild.id });
			db.merchChannel.spamProtection.forEach(obj => {
				if (obj.messageID !== member.msg) return;
				if (!obj.users.length) {
					database.updateOne({ _id: message.guild.id }, {
						$pull: {
							'merchChannel.spamProtection': { messageID: obj.messageID },
						},
					});
				}
				else {return;}
			});
		};
		return await removeMessages();
	},
};