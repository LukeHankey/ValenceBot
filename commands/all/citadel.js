/* eslint-disable quotes */
/* eslint-disable no-inline-comments */
const Discord = require('discord.js');
const { red_dark, gold, cyan } = require('../../colors.json');
const getDb = require('../../mongodb').getDb;
const { checkNum, nextDay, nEmbed, newDates, doubleDigits, checkDate } = require('../../functions.js');

/**
 * 733164313744769024 - Test Server
 * 668330890790699079 - Valence Bot Test
 * 472448603642920973 - Valence
 */

module.exports = {
	name: 'citadel',
	description: ['Lists out the citadel commands.', 'Toggles the citadel reset time & reminders on/off.', 'Shows the current Citadel Reset Time.', 'Allows a user to suggest the reset time - Sends info to the current Admin Channel.', 'Sets the new Citadel Reset Time.', 'Lists the current citadel reminders by ID.', 'Adds a new citadel reminder.', 'Adds a citadel reminder which sends the set message at reset +<date/time>.', 'Removes a citadel reminder.', 'Edit an existing citadel reminder by ID, then the field you want to change; then the updated value.'],
	aliases: ['c', 'cit'],
	usage:  ['', 'on/off', 'reset', 'reset info', 'reset set', 'reminders', 'reminders add <channel> <message>', 'reminders add <channel> reset +<days/time> <message>', 'reminders remove <id>', 'reminders edit <id> <parameter> <new value>'],
	guildSpecific: ['733164313744769024', '668330890790699079', '472448603642920973'],
	permissionLevel: 'Everyone',
	run: async (client, message, args, perms, channels) => {
		const db = getDb();
		const settings = db.collection('Settings');
		const { prefix, channels: { adminChannel }, citadel_reset_time: { day, hour, minute, reminders } } = await settings.findOne({ _id: message.guild.id }, { projection: { citadel_reset_time: { day: 1, hour: 1, minute: 1, reminders: 1, scheduled: 1 } } });
		const channelTagCit = [];

		if (args[2] === undefined) {
			channelTagCit.push('false');
		}
		else {
			channelTagCit.push(args[2].slice(2, 20));
		}

		const oneDay = 24 * 60 * 60 * 1000;
		const oneHour = 60 * 60 * 1000;
		const oneMinute = 60 * 1000;

		const messageContentCit = args.slice(3).join(' ');
		const messageContentCitR = args.slice(5).join(' ');
		const dayCheck = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

		const dayNum = dayCheck.indexOf(day);
		const resetString = nextDay(dayNum).toUTCString().split(' ');
		resetString.splice(4, 1, `${hour}:${minute}:00`);
		const resetms = Date.parse(resetString.join(' '));

		switch (args[0]) {
		case 'reminders':
			switch (args[1]) {
			case 'add':
				if (perms.mod) {
					if (checkNum(args[2], 1, Infinity) && message.guild.channels.cache.has(args[2])) {
						if (args[3] === 'reset') {
							if (!args[4] || args[4].charAt(0) !== '+') {
								message.channel.send(`\`\`\`diff\n+ For setting a citadel reminder at reset plus "x" amount of time, you must include the amount of time after a reset for your given message to send.\n\nExample:\n> ${prefix}citadel reminders add <channel> reset +3d0h0m <message>\`\`\``);
							}
							else {
								const dateDay = args[4].slice(1);
								const dateHour = dateDay.slice(2);
								const dateMin = dateHour.slice(dateHour.indexOf('h'));
								const dayChecks = checkNum(dateDay.slice(0, dateDay.indexOf('d')), 0, 6) && dateDay.includes('d');
								const hourCheck = checkNum(dateHour.slice(0, dateHour.indexOf('h')), 0, 168) && dateHour.includes('h');
								const minCheck = checkNum(dateMin.slice(1, dateMin.length - 1), 0, 10080) && dateMin.includes('m');
								const totalCheck = (dateDay.slice(0, dateDay.indexOf('d')) * oneDay) + (dateHour.slice(0, dateHour.indexOf('h')) * oneHour) + (dateMin.slice(1, dateMin.length - 1) * oneMinute);
								const totalms = 604800000;

								const newDate = newDates(dateDay.slice(0, dateDay.indexOf('d')), dateHour.slice(0, dateHour.indexOf('h')), dateMin.slice(1, dateMin.length - 1), resetms);

								if (dayChecks && hourCheck && minCheck && +totalCheck < totalms && newDate.split(' ')[4] !== undefined) {
									const dateDays = newDate.split(' ')[0].slice(0, 3);
									const dateHours = newDate.split(' ')[4].slice(0, 2);
									const dateMins = newDate.split(' ')[4].slice(3, 5);
									if (messageContentCitR) {
										settings.updateOne({ _id: message.guild.id }, {
											$push: { 'citadel_reset_time.reminders': { $each: [{ id: message.id, channel: args[2], dayReset: args[3], dayResetPlus: dateDay.slice(0, dateDay.indexOf('d')), hourResetPlus: dateHour.slice(0, dateHour.indexOf('h')), minResetPlus: dateMin.slice(1, dateMin.length - 1), message: messageContentCitR }] } },
										});
										message.channel.send(`A citadel reminder has been added to <#${args[2]}>. The reminder will be sent on \`${dateDays} ${dateHours}:${dateMins}\``);
										channels.logs.send(`<@${message.author.id}> added a custom Citadel Reminder in server: **${message.guild.name}** - <#${args[2]}>\n\`\`\`diff\n+ ${messageContentCitR}\`\`\``);
									}
									else {
										message.channel.send(`You're missing the message content that you want to send to <#${args[2]}>.`);
									}
								}
								else {
									message.channel.send(`Invalid Date. Acceptable values:\`\`\`diff\n+ +5d2h40m\n+ +0d0h5000m\n+ +0d140h0m\n\n> Max Values include 6 days | 168 Hours | 10080 Minutes\n> Total Time must be less than the next reset (7 days)\`\`\``);
								}
							}
						}
						else if (messageContentCit && args[3] !== 'reset') {
							settings.updateOne({ _id: message.guild.id }, {
								$push: { 'citadel_reset_time.reminders': { $each: [{ id: message.id, channel: args[2], message: messageContentCit }] } },
							});
							message.channel.send(`A citadel reminder has been added to <#${args[2]}>. **NOTE:** This reminder is to let clan members know the citadel has been reset.`);
							channels.logs.send(`<@${message.author.id}> added a Citadel Reminder in server: **${message.guild.name}** - <#${args[2]}>\n\`\`\`diff\n+ ${messageContentCit}\`\`\``);
						}
					}
					else if (checkNum(channelTagCit[0], 1, Infinity) && message.guild.channels.cache.has(channelTagCit[0])) {
						if (args[3] === 'reset') {
							if (!args[4] || args[4].charAt(0) !== '+') {
								message.channel.send(`\`\`\`diff\n+ For setting a citadel reminder at reset plus "x" amount of time, you must include the amount of time after a reset for your given message to send.\n\nExample:\n> ${prefix}citadel reminders add <channel> reset +3d0h0m <message>\`\`\``);
							}
							else {
								const dateDay = args[4].slice(1);
								const dateHour = dateDay.slice(2);
								const dateMin = dateHour.slice(dateHour.indexOf('h'));
								const dayChecks = checkNum(dateDay.slice(0, dateDay.indexOf('d')), 0, 6) && dateDay.includes('d');
								const hourCheck = checkNum(dateHour.slice(0, dateHour.indexOf('h')), 0, 168) && dateHour.includes('h');
								const minCheck = checkNum(dateMin.slice(1, dateMin.length - 1), 0, 10080) && dateMin.includes('m');
								const totalCheck = (dateDay.slice(0, dateDay.indexOf('d')) * oneDay) + (dateHour.slice(0, dateHour.indexOf('h')) * oneHour) + (dateMin.slice(1, dateMin.length - 1) * oneMinute);
								const totalms = 604800000;

								const newDate = newDates(dateDay.slice(0, dateDay.indexOf('d')), dateHour.slice(0, dateHour.indexOf('h')), dateMin.slice(1, dateMin.length - 1), resetms);

								if (dayChecks && hourCheck && minCheck && +totalCheck < totalms && newDate.split(' ')[4] !== undefined) {
									const dateDays = newDate.split(' ')[0].slice(0, 3);
									const dateHours = newDate.split(' ')[4].slice(0, 2);
									const dateMins = newDate.split(' ')[4].slice(3, 5);
									if (messageContentCitR) {
										settings.updateOne({ _id: message.guild.id }, {
											$push: { 'citadel_reset_time.reminders': { $each: [{ id: message.id, channel: channelTagCit[0], dayReset: args[3], dayResetPlus: dateDay.slice(0, dateDay.indexOf('d')), hourResetPlus: dateHour.slice(0, dateHour.indexOf('h')), minResetPlus: dateMin.slice(1, dateMin.length - 1), message: messageContentCitR }] } },
										});
										message.channel.send(`A citadel reminder has been added to <#${channelTagCit[0]}>. The reminder will be sent on \`${dateDays} ${dateHours}:${dateMins}\``);
										channels.logs.send(`<@${message.author.id}> added a custom Citadel Reminder in server: **${message.guild.name}** - <#${channelTagCit[0]}>\n\`\`\`diff\n+ ${messageContentCitR}\`\`\``);
									}
									else {
										message.channel.send(`You're missing the message content that you want to send to <#${args[2]}>.`);
									}
								}
								else {
									message.channel.send(`Invalid Date. Acceptable values:\`\`\`diff\n+ +5d2h40m\n+ +0d0h5000m\n+ +0d140h0m\n\n> Max Values include 6 days | 168 Hours | 10080 Minutes\n> Total Time must be less than the next reset (7 days)\`\`\``);
								}
							}
						}
						else if (messageContentCit && args[3] !== 'reset') {
							settings.findOneAndUpdate({ _id: message.guild.id }, {
								$push: { 'citadel_reset_time.reminders': { $each: [{ id: message.id, channel: channelTagCit[0], message: messageContentCit }] } },
							});
							message.channel.send(`A citadel reminder has been added to <#${channelTagCit[0]}>. **NOTE:** This reminder is to let clan members know the citadel has been reset.`);
							channels.logs.send(`<@${message.author.id}> added a Citadel Reminder in server: **${message.guild.name}** - <#${channelTagCit[0]}>\n\`\`\`diff\n+ ${messageContentCit}\`\`\``);
						}
					}
					else {
						message.channel.send('What do you want to set the Citadel Reminders as? Acceptable values:');
						message.channel.send(`\`\`\`diff\n+ Channel ID (18 Digits) OR Channel tag (#<Channel name>)\n+ Message content must be provided after the Channel ID/Tag\n\nNOTE:\n- This adds a citadel notification to a specific channel of your choice which lets your clan members know when the citadel has reset. An additional message will display which allows your clan members to help out with the citadel reset time.\n\nExample:\n> ${prefix}citadel reminders add <channel> <message>\`\`\``);
					}
				}
				else {
					message.channel.send(nEmbed('Permission Denied', 'You do not have permission to add a citadel Reminder!', red_dark)
						.addField('Only the following Roles & Users can:', perms.joinM, true)
						.addField('\u200b', `<@${message.guild.ownerID}>`, true));
				}
				break;
			case 'remove':
				if (perms.mod) {
					const idCheck = [];
					reminders.forEach(x => { idCheck.push(x.id); });
					if (checkNum(args[2], 1, Infinity) && idCheck.includes(args[2])) {
						message.channel.send(`Reminder \`${args[2]}\` has been deleted.`);
						channels.logs.send(`<@${message.author.id}> removed a Reminder: \`${args[2]}\``);
						settings.updateOne({ _id: message.guild.id }, { $pull: { 'citadel_reset_time.reminders': { id: args[2] } } });
					}
					else if (!args[1]) {
						message.channel.send('You must provide an ID to remove.');
					}
					else {
						message.channel.send(`There is no reminder with that ID. Use \`${prefix}citadel reminders\` to show the full list.`);
					}
				}
				else {
					message.channel.send(nEmbed('Permission Denied', 'You do not have permission to remove a Reminder!', red_dark)
						.addField('Only the following Roles & Users can:', perms.joinM, true)
						.addField('\u200b', `<@${message.guild.ownerID}>`, true));
				}
				break;
			case 'edit':
				if (perms.mod) {
					const editMessage = args.slice(4).join(' ');
					const param = args.slice(3, 4).join('').toLowerCase();
					const idCheck = [];
					reminders.forEach(x => { idCheck.push(x.id); });
					if (checkNum(args[2], 1, Infinity) && idCheck.includes(args[2])) {
						if (param === 'channel') {
							if (!args[4]) {
								message.channel.send('You need to specify a channel to change to. Either the channel ID or the channel Tag.');
							}
							else if (args[4].length > 18) {
								settings.findOneAndUpdate({ _id: message.guild.id, 'citadel_reset_time.reminders.id': args[2] }, { $set: { 'citadel_reset_time.reminders.$.channel': args[4] } });
								message.channel.send(`Reminder \`${args[2]}\` has had the channel changed to <#${args[4].slice(2, 20)}>`);
								channels.logs.send(`<@${message.author.id}> edited a Citadel Reminder: \`${args[2]}\``);
							}
							else {
								settings.findOneAndUpdate({ _id: message.guild.id, 'citadel_reset_time.reminders.id': args[2] }, { $set: { 'citadel_reset_time.reminders.$.channel': args[4] } });
								message.channel.send(`Reminder \`${args[2]}\` has had the channel changed to <#${args[4]}>`);
								channels.logs.send(`<@${message.author.id}> edited a Citadel Reminder: \`${args[2]}\``);
							}
						}
						else if (param === 'message') {
							if (!editMessage) {
								message.channel.send('You need to specify the message content you\'d like to change.');
							}
							else {
								settings.findOneAndUpdate({ _id: message.guild.id, 'citadel_reset_time.reminders.id': args[2] }, { $set: { 'citadel_reset_time.reminders.$.message': editMessage } });
								message.channel.send(`Reminder \`${args[2]}\` has had the message changed to \`${editMessage}\``);
								channels.logs.send(`<@${message.author.id}> edited a Citadel Reminder: \`${args[2]}\``);
							}
						}
						else {
							message.channel.send('You must provide a parameter to edit. You can edit either the `Channel` or the `Message`.');
						}
					}
					else if (!args[2]) {
						message.channel.send('You must provide an ID to remove.');
					}
					else {
						message.channel.send(`There is no reminder with that ID. Use \`${prefix}citadel reminders\` to show the full list.`);
					}
				}
				else {
					message.channel.send(nEmbed('Permission Denied', 'You do not have permission to remove a Reminder!', red_dark)
						.addField('Only the following Roles & Users can:', perms.joinM, true)
						.addField('\u200b', `<@${message.guild.ownerID}>`, true));
				}
				break;
			default: {
				const citRem = [];
				if (reminders.length === 0) {
					message.channel.send('You have no citadel reminders set.');
				}
				else {
					message.channel.send(`Current Reminders:\n${citRem.join('')}`);
				}
				reminders.forEach(x => {
					if (x.dayReset === 'reset') {
						const newDate = newDates(`${dayCheck.indexOf(x.dayResetPlus) || +x.dayResetPlus}`, +x.hourResetPlus, +x.minResetPlus, resetms);
						const dateDays = newDate.split(' ')[0].slice(0, 3);
						const dateHours = newDate.split(' ')[4].slice(0, 2);
						const dateMins = newDate.split(' ')[4].slice(3, 5);
						if (reminders.length > 0) {
							if (x.channel.length > 18) {
								citRem.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel.slice(2, 20)}>, Date: \`${dateDays} ${dateHours}:${dateMins}\`, Message: ${x.message}\n`);
							}
							else {
								citRem.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel}>, Date: \`${dateDays} ${dateHours}:${dateMins}\`, Message: ${x.message}\n`);
							}
						}
					}
					else if (x.channel.length > 18) {
						citRem.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel.slice(2, 20)}>, Date: \`${dayCheck[day] || day} ${doubleDigits(hour)}:${doubleDigits(minute)}\`, Message: ${x.message}\n`);
					}
					else {
						citRem.push(`**ID:** \`${x.id}\`, Channel: <#${x.channel}>, Date: \`${dayCheck[day] || day} ${doubleDigits(hour)}:${doubleDigits(minute)}\`, Message: ${x.message}\n`);
					}
				});
			}
				break;
			}
			break;
		case 'reset':
			switch (args[1]) {
			case 'set':
				if (perms.mod) {
					if ((checkDate(args[2], 0, 6) || dayCheck.includes(args[2]) || dayCheck[new Date().getUTCDay()].substr(0, 3)) && checkDate(args[3], 0, 23) && checkDate(args[4], 0, 59) && args[2] && args[3] && args[4]) { // Setting reset by Day / Hour / Minute
						const { value } = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'citadel_reset_time.day': dayCheck[args[2]] || args[2], 'citadel_reset_time.hour': doubleDigits(args[3]), 'citadel_reset_time.minute': doubleDigits(args[4]) } }, { returnOriginal: true });
						console.log(`Reset set: ${dayCheck[args[2]] || args[2]} ${doubleDigits(args[3])}:${doubleDigits(args[4])}`);
						message.channel.send(`The Citadel Reset Time has been changed to: ${dayCheck[args[2]] || args[2]} ${doubleDigits(args[3])}:${doubleDigits(args[4])}`);
						channels.logs.send(`<@${message.author.id}> changed the Citadel Reset Time in server: **${message.guild.name}**\n\`\`\`diff\n- ${value.citadel_reset_time.day} ${value.citadel_reset_time.hour}:${value.citadel_reset_time.minute}\n+ ${dayCheck[args[2]] || args[2]} ${doubleDigits(args[3])}:${doubleDigits(args[4])} \`\`\``);
					}
					else if (checkDate(args[2], 0, 23) && checkDate(args[3], 0, 59) && args[2] && args[3]) { // Setting by Hour / Minute
						const { value } = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'citadel_reset_time.hour': doubleDigits(args[2]), 'citadel_reset_time.minute': doubleDigits(args[3]) } }, { returnOriginal: true });
						console.log(`Reset set: ${dayCheck[value.citadel_reset_time.day] || value.citadel_reset_time.day} ${doubleDigits(args[2])}:${doubleDigits(args[3])}`);
						message.channel.send(`The Citadel Reset Time has been changed to: ${dayCheck[value.citadel_reset_time.day] || value.citadel_reset_time.day} ${doubleDigits(args[2])}:${doubleDigits(args[3])}`);
						channels.logs.send(`<@${message.author.id}> changed the Citadel Reset Time in server: **${message.guild.name}**\n\`\`\`diff\n- ${value.citadel_reset_time.day} ${value.citadel_reset_time.hour}:${value.citadel_reset_time.minute}\n+ ${dayCheck[value.citadel_reset_time.day] || value.citadel_reset_time.day} ${doubleDigits(args[2])}:${doubleDigits(args[3])}\`\`\``);
					}
					// eslint-disable-next-line no-octal
					else if (checkDate(args[2], 00, 59) && args[2]) { // Setting by Minute
						const { value } = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'citadel_reset_time.minute': doubleDigits(args[2]) } }, { returnOriginal: true });
						console.log(`Reset set: ${dayCheck[value.citadel_reset_time.day] || value.citadel_reset_time.day} ${doubleDigits(value.citadel_reset_time.hour)}:${doubleDigits(args[2])}`);
						message.channel.send(`The Citadel Reset Time has been changed to: ${dayCheck[value.citadel_reset_time.day] || value.citadel_reset_time.day} ${doubleDigits(value.citadel_reset_time.hour)}:${doubleDigits(args[2])}`);
						channels.logs.send(`<@${message.author.id}> changed the Citadel Reset Time in server: **${message.guild.name}**\n\`\`\`diff\n- ${value.citadel_reset_time.day} ${value.citadel_reset_time.hour}:${value.citadel_reset_time.minute}\n+ ${dayCheck[value.citadel_reset_time.day] || value.citadel_reset_time.day} ${doubleDigits(value.citadel_reset_time.hour)}:${doubleDigits(args[2])}\`\`\``);
					}
					else {
						message.channel.send('What do you want to set the Citadel Reset Time to? Acceptable values:');
						message.channel.send(`\`\`\`diff\n+ DD HH MM (Sat 14 02)\n+ HH MM (14 02)\n+ MM (02)\n \n\nNOTE:\n- The Reset Time must be the same as Game Time.\n- If specifying a Day, you can use shorthand (Mon), full names (Monday) or numbers (1)!\n- Monday/Mon/1 | Tuesday/Tue/2 | Wednesday/Wed/3 | Thursday/Thu/4 | Friday/Fri/5 | Saturday/Sat/6 | Sunday/Sun/0\`\`\``);
					}
				}
				else {
					message.channel.send(nEmbed('Permission Denied', 'You do not have permission to change the Citadel Reset Time!', red_dark)
						.addField('Only the following Roles & Users can:', perms.joinM, true)
						.addField('\u200b', `<@${message.guild.ownerID}>`, true));
				}
				break;
			case 'info':
				if (args[2] && args[3] && args[4]) {
					if (checkDate(args[2], 0, 6)) {
						if (checkDate(args[3], 0, 23)) {
							if (checkDate(args[4], 0, 59)) {
								const now = Date.now();
								const newDate = newDates(args[2], args[3], args[4], now);
								const dateDay = newDate.split(' ')[0].slice(0, 3);
								const dateHour = newDate.split(' ')[4].slice(0, 2);
								const dateMin = newDate.split(' ')[4].slice(3, 5);

								const infoEmbedOne = new Discord.MessageEmbed()
									.setTitle('**Citadel Reset Time Suggestion**')
									.setColor(gold)
									.setDescription(`<@${message.author.id}> used the Citadel Info command to suggest the new Reset Time.`)
									.addFields(
										{ name: 'Input', value: `${args[2]} days, ${args[3]} hours and ${args[4]} minutes until Reset.` },
										{ name: 'Conversion', value: `${newDate}`, inline: true },
										{ name: 'Next Reset Time', value: `${dateDay} ${dateHour}:${dateMin}`, inline: true },
										{ name: 'Command', value: `\`${prefix}citadel reset set ${dateDay} ${dateHour} ${dateMin}\``, inline: false },
										{ name: 'Reactions', value: '✅ - Accept the time given. Command has a 24 hour cooldown to prevent spam.\n❌ - Reject input. Command can be re-used.', inline: false },
									)
									.setFooter(
										'Valence Bot created by Luke_#8346', client.user.displayAvatarURL(),
									)
									.setTimestamp();

								if (args[5]) {
									const array = ['gif', 'jpeg', 'tiff', 'png', 'webp', 'bmp', 'prnt.sc', 'gyazo.com'];
									if (array.some(x => args[5].includes(x))) {
										const updatedResetInfo = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { resetInfoCount: 0 } });
										if (updatedResetInfo.resetInfoCount == 0) {
											const msg = await client.channels.cache.get(channels.adminChannel).send(infoEmbedOne.setImage(`${args[5]}`));
											await msg.react('✅');
											await msg.react('❌');

											const tick = (reaction) => reaction.emoji.name === '✅';
											const cross = (reaction, user) => reaction.emoji.name === '❌' && user.id === message.author.id;

											const collectorT = msg.createReactionCollector(tick, { time: oneDay });
											const collectorC = msg.createReactionCollector(cross, { time: oneDay });

											collectorT.on('collect', () => {
												const userRoles = message.member.roles;
												if (userRoles.cache.has(updatedResetInfo.roles.modRole.slice(3, 21)) || userRoles.cache.has(updatedResetInfo.roles.adminRole.slice(3, 21))) {return;}
												else {
													settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { resetInfoCount: 1, resetInfoTime: message.createdTimestamp } }, { returnOriginal: false });
												}
											});
											collectorC.on('collect', () => {
												settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { resetInfoCount: 0 } });
											});
											message.delete();
											message.reply('Thank you for helping to suggest the Citadel Reset Time. Your response has been recorded!');
										}
										else if (updatedResetInfo.resetInfoCount == 1) {
											message.channel.send('You can\'t use that command again. Please wait until the next reset!');
										}
									}
									else {
										message.channel.send('That is not a valid image URL.');
									}
								}
								else {
									const updated = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { resetInfoCount: 0 } });
									if (updated.resetInfoCount == 0) {
										const msg = await client.channels.cache.get(channels.adminChannel).send(infoEmbedOne);
										await msg.react('✅');
										await msg.react('❌');

										const tick = (reaction) => reaction.emoji.name === '✅';
										const cross = (reaction, user) => reaction.emoji.name === '❌' && user.id === message.author.id;

										const collectorT = msg.createReactionCollector(tick, { time: day });
										const collectorC = msg.createReactionCollector(cross, { time: day });

										collectorT.on('collect', () => {
											const userRoles = message.member.roles;
											if (userRoles.cache.has(updated.roles.modRole.slice(3, 21)) || userRoles.cache.has(updated.roles.adminRole.slice(3, 21))) {return;}
											else {
												settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { resetInfoCount: 1, resetInfoTime: message.createdTimestamp } }, { returnOriginal: false });
											}
										});
										collectorC.on('collect', () => {
											settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { resetInfoCount: 0 } });
										});
										message.delete();
										message.reply('Thank you for helping to suggest the Citadel Reset Time. Your response has been recorded!');
									}
									else if (updated.resetInfoCount === 1) {
										message.channel.send('You can\'t use that command again. Please wait until the next reset!');
									}
								}
							}
							else {
								message.channel.send('Invalid minute parameter! Minutes range from 00 - 59.');
							}
						}
						else {
							message.channel.send('Invalid hour parameter! Hours range from 00 - 23.');
						}
					}
					else {
						message.channel.send('Invalid day parameter! Days range from 0 - 6.');
					}
				}
				else {
					message.channel.send(`What do you want to suggest the Citadel Reset Time as: Acceptable values:\`\`\`${prefix}citadel reset info <days> <hours> <minutes> <image>\n\nNOTE: The image is optional and if included, should show the Citadel Reset Time in the Citadel Management Screen.\`\`\``);
				}
				break;
			default:
				if (!args[1] && day === '*') {
					message.channel.send('Your Citadel Reset Time is set as: `Not set.`');
				}
				else {
					message.channel.send(`Your Citadel Reset Time is set as: \`${day || dayCheck[day]} ${hour}:${minute}\`\nTo set the Reset Time, use the \`${prefix}citadel reset set\` command.`);
				}
				break;
			}
			break;
		case 'on':
			if (perms.admin) {
				if (adminChannel === null) {
					message.channel.send('You must set your Admin Channel before you set the Citadel notifications.');
				}
				else {
					const { value } = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'citadel_reset_time.scheduled': true } }, { returnOriginal: true });
					message.channel.send('The Citadel Reset Time notifications have been toggled on!');
					channels.logs.send(`<@${message.author.id}> toggled the Citadel Reset Time to on in server: **${message.guild.name}**\n\`\`\`diff\n- ${value.citadel_reset_time.scheduled}\n+ true\`\`\``);
				}
			}
			else {
				message.channel.send(nEmbed('Permission Denied', 'You do not have permission to toggle the Citadel Reset Time notifications!', red_dark)
					.addField('Only the following Roles & Users can:', perms.joinA, true)
					.addField('\u200b', `<@${message.guild.ownerID}>`, true));
			}
			break;
		case 'off':
			if (perms.admin) {
				const { value } = await settings.findOneAndUpdate({ _id: message.guild.id }, { $set: { 'citadel_reset_time.scheduled': false } }, { returnOriginal: true });
				message.channel.send('The Citadel Reset Time notifications have been toggled off!');
				channels.logs.send(`<@${message.author.id}> toggled the Citadel Reset Time to on in server: **${message.guild.name}**\n\`\`\`diff\n- ${value.citadel_reset_time.scheduled}\n+ false\`\`\``);
			}
			else {
				message.channel.send(nEmbed('Permission Denied', 'You do not have permission to toggle the Citadel Reset Time notifications!', red_dark)
					.addField('Only the following Roles & Users can:', perms.joinA, true)
					.addField('\u200b', `<@${message.guild.ownerID}>`, true));
			}
			break;
		default: {
			const { commands } = message.client;
			const com = commands.map(command => {
				if (command.name === 'citadel') {
					command.usage.shift();
					return `\`${command.usage.join('\n')}\``;
				}
			});

			message.channel.send(nEmbed(
				'**Citadel Commands List**',
				'Here\'s a list of all the citadel settings:',
				cyan,
				client.user.displayAvatarURL(),
			)
				.addFields({ name: '**Commands:**', value: com, inline: true }));
		}
		}
	},
};
