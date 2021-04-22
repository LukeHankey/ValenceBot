/* eslint-disable no-inline-comments */
const cron = require('node-cron');
const getDb = require('../../mongodb').getDb;
const colors = require('../../colors.json');
const { Permissions } = require('../../classes.js');
const { MessageEmbed } = require('discord.js');

module.exports = async (client, message) => {
	const db = getDb();
	const settingsColl = db.collection('Settings');
	const globalDB = await settingsColl.findOne({ _id: 'Globals' });

	const channels = {
		vis: globalDB.channels.vis,
		errors: globalDB.channels.errors,
		logs: globalDB.channels.logs,
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

	// Merch Posts Publish

	// if (message.channel.id === '770307127557357648') {
	// 	if (message.author.bot) {
	// 		message.crosspost()
	// 	}
	// }

	if (message.author.bot) return;

	// Valence - Filter

	const filterWords = ['retard', 'nigger'];
	const blocked = filterWords.filter(word => {
		return message.content.toLowerCase().includes(word);
	});

	if (message.guild.id === '472448603642920973' && blocked.length > 0) message.delete();

	// DSF - Merch Calls

	await settingsColl.findOne({ _id: message.guild.id, merchChannel: { $exists: true } })
		.then(async res => {
			if (res === null) return; // null if merchChannel property doesn't exist
			const merchID = await res.merchChannel.channelID;
			const otherID = await res.merchChannel.otherChannelID;
			const errorLog = [];
			const botServerWebhook = await client.channels.cache.get('784543962174062608').fetchWebhooks();
			const dsfServerWebhook = await client.channels.cache.get('794608385106509824').fetchWebhooks();
			errorLog.push(dsfServerWebhook.first(), botServerWebhook.first());

			if (message.channel.id === merchID) {
				const merchRegex = /(^(?:m|merch|merchant|w|world){1}(\s?)(?!3$|7$|8$|11$|13$|17|19|20|29|33|34|38|41|43|47|57|61|75|80|81|90|93|94|101|102|10[7-9]|11[0-3]|12[0-2]|12[5-9]|13[0-3]|135|136)([1-9]\d?|1[0-3]\d|140)([,.\s]?|\s+\w*)*$)/i;
				merchRegex.test(message.content)
					? message.channel.send(`<@&670842187461820436> - ${message.content}`).then(m => m.delete()).catch(async err => {
						const messageID = err.path.split('/');
						return await message.channel.messages.fetch(messageID[4]).then(x => x.delete()).catch(() => console.log('Unable to delete message'));
					})
					: message.delete();

				if (message.author.bot) return;

				try {
					// Adding count to members
					const mesOne = await message.channel.messages.fetch({ limit: 1 });
					const logOne = [...mesOne.values()];
					const msg = logOne.map(val => val);
					const tracker = await res.merchChannel.scoutTracker;

					const findMessage = tracker.find(x => x.userID === msg[0].author.id);
					const userN = message.member;
					if (!findMessage) {
						if (!merchRegex.test(message.content)) {
							console.log(`New & Spam: ${userN.user.username} (${message.content})`, userN.id);
							return errorLog.forEach(id => id.send(` \`\`\`diff\n\n+ Spam Message - (User has not posted before)\n- User ID: ${userN.id}\n- User: ${userN.user.username}\n- Content: ${message.content}\`\`\``));
						}
						console.log(`New: ${userN.user.username} (${message.content})`, userN.id);
						await settingsColl.findOneAndUpdate({ _id: message.guild.id },
							{
								$addToSet: {
									'merchChannel.scoutTracker': {
										$each: [{
											userID: msg[0].author.id,
											author: msg[0].member?.nickname ?? msg[0].author.username,
											firstTimestamp: msg[0].createdTimestamp,
											firstTimestampReadable: new Date(msg[0].createdTimestamp),
											lastTimestamp: msg[0].createdTimestamp,
											lastTimestampReadable: new Date(msg[0].createdTimestamp),
											count: 1,
											otherCount: 0,
											assigned: [],
										}],
									},
								},
							});
					}
					else {
						if (!merchRegex.test(message.content)) {
							console.log(`Old & Spam: ${userN.user.username} (${message.content})`, userN.user.id);
							return errorLog.forEach(id => id.send(` \`\`\`diff\n+ Spam Message - (User has posted before)\n\n- User ID: ${userN.user.id}\n- User: ${userN.user.username}\n- Content: ${message.content}\`\`\``));
						}
						console.log(`Old: ${userN.user.username} (${message.content})`, findMessage.userID === userN.id, findMessage.userID);
						await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
							$inc: {
								'merchChannel.scoutTracker.$.count': 1,
							},
							$set: {
								'merchChannel.scoutTracker.$.author': msg[0].member?.nickname ?? msg[0].author.username,
								'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
								'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
							},
						});
					}

					// Database logging for merch worlds
					let mes = await message.channel.messages.fetch({ limit: 10 });
					mes = mes.filter(m => {
						if (m.reactions.cache.has('☠️')) return;
						else return mes;
					});
					const log = [...mes.values()];
					for (const messages in log) {
						const authorName = log[messages].member?.nickname ?? log[messages].author.username;
						if (authorName === null) return;
						await settingsColl.findOneAndUpdate({ _id: message.guild.id },
							{
								$addToSet: {
									'merchChannel.messages': {
										$each: [{
											messageID: log[messages].id,
											content: log[messages].content,
											time: log[messages].createdTimestamp,
											author: authorName,
											userID: log[messages].member?.id ?? log[messages].author.id,
										}],
									},
									'merchChannel.spamProtection': {
										$each: [{
											messageID: log[messages].id,
											content: log[messages].content,
											time: log[messages].createdTimestamp,
											author: authorName,
											userID: log[messages].member?.id ?? log[messages].author.id,
											users: [],
										}],
									},
								},

							},
						);
					}

					// Posts only error to the error channel
					await settingsColl.findOne({ _id: message.guild.id }).then(async data => {
						const errorEmbed = (document, error) => {
							const embed = new MessageEmbed()
								.setTitle('Error: Unknown Message')
								.setDescription(`Message has been deleted. Removing from the DataBase. - **${data.serverName}**`)
								.setColor(colors.red_dark)
								.addField('Message ID/Content:', `${document.messageID}\n${document.content}`, true)
								.addField('Author ID/Tag:', `${document.userID}\n<@!${document.userID}>`, true)
								.addField('Message Timestamp:', `${new Date(document.time).toString().split(' ').slice(0, -4).join(' ')}`, true)
								.addField('Stack Trace', `\`\`\`js\n${error.stack}\`\`\``);
							return embed;
						};
						const errorSet = new Set();

						for await (const doc of data.merchChannel.messages) {
							const lastID = doc.messageID;

							try {
								await message.channel.messages.fetch(lastID);
							}
							catch (err) {
								if (err.code === 10008) {
									if (doc.userID === '668330399033851924') return;
									errorSet.add({ document: doc, error: err });
								}
							}
						}
						const errValues = errorSet.values();
						const errNext = errValues.next().value;

						if (errorSet.size) {
							return errorLog.forEach(id => {
								id.send(errorEmbed(errNext.document, errNext.error).addField('Notes:', '- Mark with ✅ when complete so we know if it has been looked at or not.\n- Mark with ❌ if it doesn\'t need doing.'))
									.then(async () => {
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { 'messageID': errNext.document.messageID } } });
										errorSet.delete({ document: errNext.document, error: errNext.error });
										errorSet.clear();
									});
							});
						}
						else {return;}
					});

					// Checking the DB and marking dead calls
					const timer = cron.schedule('* * * * *', async () => {
						await settingsColl.findOne({ _id: message.guild.id }).then(async data => {
							for await (const doc of data.merchChannel.messages) {
								const lastID = doc.messageID;
								const lastTime = doc.time;

								try {
									if (doc.userID === '668330399033851924') {
										await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: doc.messageID } } });
									}
									else {
										console.log(doc);
										const check = Date.now() - lastTime > 600000;

										if (check) {
											const fetched = await message.channel.messages.fetch(lastID);
											console.log(3, check);
											fetched.react('☠️')
												.then(async () => {
													await settingsColl.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: lastID } } });
												})
												.catch(() => {
													console.log(2);
													return timer.stop();
												});
										}
									}
								}
								catch (e) {
									if (e.code === 10008) {
										const messageID = e.path.split('/');
										const x = botServerWebhook.first();
										await settingsColl.findOne({ _id: message.guild.id })
											.then((dataError) => {
												const { merchChannel } = dataError;
												const messages = merchChannel.messages;

												const found = messages.find(id => id.messageID === messageID[4]);
												// Check if found is just the messages that have been deleted by original poster
												settingsColl.updateOne({ _id: message.guild.id }, { $pull: { 'merchChannel.messages': { messageID: messageID[4] } } });
												x.send(`Remove from Database - Unable to fetch ${found.messageID}\n\`\`\`diff\n+ User deleted own message \n\n- User ID: ${found.userID}\n- User: ${found.author}\n- Content: ${found.content}\`\`\``);
												return timer.stop();
											});
									}
									else {
										console.error(e);
									}

								}
							}
						});
					});
				}
				catch (err) {
					console.log(err);
				}
			}
			else if (message.channel.id === otherID) {
				// Adds count for other events channel
				try {
					const mesOne = await message.channel.messages.fetch({ limit: 1 });
					const logOne = [...mesOne.values()];
					const msg = logOne.map(val => val);
					const tracker = await res.merchChannel.scoutTracker;

					const findMessage = await tracker.find(x => x.userID === msg[0].author.id);
					if (!findMessage) {
						await settingsColl.findOneAndUpdate({ _id: message.guild.id },
							{
								$addToSet: {
									'merchChannel.scoutTracker': {
										$each: [{
											userID: msg[0].author.id,
											author: msg[0].member.nickname ?? msg[0].author.username,
											firstTimestamp: msg[0].createdTimestamp,
											firstTimestampReadable: new Date(msg[0].createdTimestamp),
											lastTimestamp: msg[0].createdTimestamp,
											lastTimestampReadable: new Date(msg[0].createdTimestamp),
											count: 0,
											otherCount: 1,
											assigned: [],
										}],
									},
								},
							});
					}
					else {
						await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
							$inc: {
								'merchChannel.scoutTracker.$.otherCount': 1,
							},
							$set: {
								'merchChannel.scoutTracker.$.author': msg[0].member?.nickname ?? msg[0].author.username,
								'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
								'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
							},
						});
					}
				}
				catch (e) {
					console.log(e);
				}
			}
			else {return;}
		});

	// Valence Events Channel
	await settingsColl.findOne({ _id: message.guild.id, 'channels.events': { $exists: true } })
		.then(async (DB) => {
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
				const randomNum = () => (Math.round(Math.random() * 10000) + 1);
				await last.react('❌');
				await last.react('✅');

				try {
					const filter = (reaction, user) => ['❌', '✅'].includes(reaction.emoji.name) && user.id === message.author.id;
					const collectOne = await message.awaitReactions(filter, { max: 1, time: 300000, errors: ['time'] });
					const collectOneReaction = collectOne.first();

					if (collectOneReaction.emoji.name === '❌') {
						return collectOneReaction.message.reactions.removeAll();
					}
					else if (collectOneReaction.emoji.name === '✅') {
						const newRole = await message.guild.roles.create({ data: {
							name: eventTitle[0].concat(` #${randomNum()}`),
						} });

						const calChannel = message.guild.channels.cache.find((ch) => ch.name === 'calendar');
						const dateRegex = /^(Date(:)?\s)+((3[0-1]|2\d|1\d|[1-9])(st|nd|rd|th)?)+\s?((-|to)+\s?((3[0-1]|2\d|1\d|[1-9])(st|nd|rd|th)?)+)?(\s)?$/im;
						const timeRegex = /^(Time(:)?\s)+(([1-6]+(\s)?(day(s)?|week(s)?|month(s)?)(\s)?$)?|(([0-1]\d|2[0-3]):([0-5]\d)\s)?(-|to)+\s?(([0-1]\d|2[0-3]):([0-5]\d))?)$/im;
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
									client.channels.cache.get(DB.channels.mod).send(`${last.author}, there was an error with both the  \`Time\` and \`Date\` parameters and they have been set as null. Please go update the calendar for your event.`);
								}
								else {
									// eslint-disable-next-line no-useless-escape
									client.channels.cache.get(DB.channels.mod).send(`${last.author}, ${time === 'null' ? 'there was an error with the  \`Time\` parameter and it has been set as null. Please go update the calendar for your event.' : 'there was an error with the  \`Date\` parameter and it has been set as null. Please go update the calendar for your event.'}`);
								}
							}

							const editEmbed = new MessageEmbed(m.embeds[0]);
							editEmbed.addFields(
								{ name: date, value: `Event: ${eventTitle[0]}\nTime: ${time}\n[Announcement](${link})\nHost: ${last.author}` },
							);
							m.edit(editEmbed);
							client.channels.cache.get(channels.logs).send(`Calendar updated - ${message.author} added an event automatically: \`\`\`Date: ${date}, Event: ${eventTitle[0]}, Time: ${time}, Link: ${link}, Host: ${last.author}\`\`\``);
						};

						if (!dateRegex.test(last.content) || !timeRegex.test(last.content)) {
							dateRegex.test(last.content) ? addToCal(dateR, timeR) : addToCal(dateR, timeR);
						}
						else {
							addToCal(dateR, timeR);
						}

						await settingsColl.updateOne({ _id: message.guild.id }, { $push: { events: { $each: [ { messageID: last.id, roleID: newRole.id, eventTag: newRole.name.slice(eventTitle[0].length + 2), members: [] } ] } } });
						await collectOneReaction.message.reactions.removeAll();
						await last.react('📌');
						await last.react('✅');
					}
					else {return;}
				}
				catch (err) {
					console.log(err);
					if (err.code === 500035) {
						message.guild.channels.cache.get(DB.channels.mod).send(`${message.member} reacted with ✅ but the Event Title (1st line) is too long. Max of 100 characters.`);
					}
				}
			}
		});


	// Commands
	try {
		const commandDB = await settingsColl.findOne({ _id: `${message.guild.id}` });
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

	// Update DB
	// try {
	// 	await settingsColl.find({ _id: message.guild.id }).forEach(async doc => { // Updates all by removing a field
	// 	let arr = doc.merchChannel.scoutTracker;
	// 	let length = arr.length;
	// 	for (let i = 0; i < length; i++) {
	// 		delete arr[i]["assigned"];
	// 	}
	// 	// await settingsColl.save(doc);
	// 	await settingsColl.update({ _id: message.guild.id }, { // Updates all by adding a field
	// 		$set: {
	// 			'merchChannel.scoutTracker.$[].otherCount': 0,
	// 		},
	// 	})
	// })

	// Finds a profile and adds to it
	// await settingsColl.updateOne({ _id: message.guild.id, 'merchChannel.scoutTracker.author': 'Attaining'}, {
	// 	$inc: {
	// 		'merchChannel.scoutTracker.$.otherCount': 85,
	// 	},
	// })

	// } catch (err) {
	// 	console.log(err)
	// }
};