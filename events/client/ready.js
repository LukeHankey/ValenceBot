/* eslint-disable max-nested-callbacks */
/* eslint-disable no-octal */
/* eslint-disable no-inline-comments */
const Discord = require('discord.js');
const getDb = require('../../mongodb').getDb;
const fetch = require('node-fetch');
const cron = require('node-cron');
const randomColor = Math.floor(Math.random() * 16777215).toString(16);
const func = require('../../functions');
const colors = require('../../colors.json');
const { ScouterCheck } = require('../../classes.js');

module.exports = async client => {
	console.log('Ready!');

	client.user.setPresence({
		status: 'idle',
		activity: { type: 'LISTENING', name: 'DMs for Bot Help!' },
	});

	const factEmbed = function(factMessage) {
		const embed = new Discord.MessageEmbed()
			.setTitle('**Daily Valence Fact**')
			.setDescription(factMessage)
			.setColor(`#${randomColor}`)
			.addField('**Sent By:**', '<@&685612946231263232>', true)
			.setTimestamp();
		return embed;
	};

	function csvJSON(csv) {

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

		// return result; //JavaScript object
		return JSON.parse(JSON.stringify(result)); // JSON
	}

	const db = getDb();
	const usersColl = db.collection('Users');


	// eslint-disable-next-line no-unused-vars
	const getData = async () => {
		const clanData = await fetch('http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Valence');
		const text = clanData.text();
		const json = text.then(body => csvJSON(body));

		json.then(res => {
			const newData = [];

			for (const data of res) {
				const regex = /�/g;
				if ((data.Clanmate).includes('�')) {
					data.Clanmate = data.Clanmate.replace(regex, ' ') || data.Clanmate;
				}
				newData.push(data);
			}

			newData.forEach(e => {
				e._id = e.Clanmate.toUpperCase();
			});
			usersColl.insertMany(newData, { ordered: false });
		})
			.catch(error => console.error(error));
	};
	// getData()

	usersColl.updateMany(
		{},
		{
			$set:
			{
				'Caps': 0,
				'Total Points': 0,
				'Events': 0,
				'Recruits': 0,
				'Additional Points': 0,
				'Donations': 0,
				'Hosts': 0,
				'Events & Recruits': 0,
				'Rank Earned': '',
				'Donation Points': 0,
			},
		},
		{ upsert: true },
	);

	const vFactsColl = await db.collection('Facts');
	const settings = await db.collection('Settings');
	const code = '```';
	cron.schedule('0 10 * * *', async () => {
		const count = await vFactsColl.stats()
			.then(res => {
				return res.count;
			});
		const random = Math.floor((Math.random() * count) + 1);

		await vFactsColl.findOne({ number: random })
			.then(res => {
				const ID = ['732014449182900247', '473235620991336468']; // #test-channel & #good-chats

				ID.forEach(channel => {
					client.channels.cache.get(channel).send(factEmbed(res.Message));
				});
			});
	});

	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	// Citadel Server Reminders //
	await settings.find({}).toArray().then(r => {
		for (const document in r) {
			if (!r[document].citadel_reset_time) return;
			cron.schedule('*/5 * * * *', async () => {
				const today = new Date();
				const today_num = today.getUTCDay();
				const today_str = days[today_num];
				// eslint-disable-next-line no-shadow
				const newDates = function(days, hours, minutes, timer) {
					const time = func.msCalc(days, func.doubleDigits(hours), func.doubleDigits(minutes)) + timer;
					return new Date(time).toUTCString();
				};
				await settings.find({}).toArray().then(res => {
					const dayNum = days.indexOf(res[document].citadel_reset_time.day);
					const resetString = func.nextDay(dayNum).toUTCString().split(' ');
					resetString.splice(4, 1, `${res[document].citadel_reset_time.hour}:${res[document].citadel_reset_time.minute}:00`);
					const resetms = Date.parse(resetString.join(' '));

					const reminders = res[document].citadel_reset_time.reminders;
					for (const remDoc in reminders) {
						if (reminders[remDoc].dayReset === 'reset') {
							const newDate = newDates(reminders[remDoc].dayResetPlus, reminders[remDoc].hourResetPlus, reminders[remDoc].minResetPlus, resetms);
							const dateDays = newDate.split(' ')[0].slice(0, 3);
							const dateHours = newDate.split(' ')[4].slice(0, 2);
							const dateMins = newDate.split(' ')[4].slice(3, 5);

							if (dateDays === today_str.substr(0, 3)) {
								if (today.getUTCHours() == +dateHours) {
									if (+dateMins <= today.getUTCMinutes() && today.getUTCMinutes() < (+dateMins + 5)) {
										client.channels.cache.get(res[document].citadel_reset_time.reminders[remDoc].channel).send(`${res[document].citadel_reset_time.reminders[remDoc].message}`);
									}
								}
							}
						}
						else if (res[document].citadel_reset_time.day === today_num || res[document].citadel_reset_time.day === today_str || res[document].citadel_reset_time.day === today_str.substr(0, 3)) {
							if (today.getUTCHours() == res[document].citadel_reset_time.hour) {
								if (res[document].citadel_reset_time.minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].citadel_reset_time.minute + 5)) {
									client.channels.cache.get(res[document].channels.adminChannel).send('@here - Set the Citadel Reset Time!');
									client.channels.cache.get(res[document].citadel_reset_time.reminders[remDoc].channel).send(`${res[document].citadel_reset_time.reminders[remDoc].message}${code}You can also help out with setting the Citadel Reset Time since it changes almost every single week! Use the following command to let your Clan Admins know the next Citadel Reset:\n\n${res[document].prefix}citadel reset info <days> <hours> <minutes> <image (optional)>\n\nExample:\n${res[document].prefix}citadel reset info 6 22 42${code}`);
								}
							}
						}
					}
				});
			}, { scheduled: r[document].citadel_reset_time.scheduled }); // Will continue to be on/off and won't switch until the bot resets
		}
	});

	// Normal Server Reminders //
	// cron.schedule(`*/5 * * * *`, async () => {
	// 	let today = new Date();
	// 	let today_num = today.getDay();
	// 	let today_str = days[today_num];
	// 	await settings.find({}).toArray().then(res => {
	// 		for (const document in res) {
	// 			for (const remDoc in res[document].reminders) {
	// 				if (res[document].reminders[remDoc].day !== undefined) {
	// 					if (+res[document].reminders[remDoc].day === today_num || res[document].reminders[remDoc].day.toLowerCase() === today_str.toLowerCase() || res[document].reminders[remDoc].day.toLowerCase() === today_str.substr(0, 3).toLowerCase()) {
	// 						if (today.getUTCHours() == +res[document].reminders[remDoc].hour) {
	// 							if (+res[document].reminders[remDoc].minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].reminders[remDoc].minute + 1)) {
	// 								client.channels.cache.get(res[document].reminders[remDoc].channel).send(res[document].reminders[remDoc].message)
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}
	// 	})
	// })

	const dsfSpamMessage = cron.schedule('*/10 * * * *', async () => {
		settings.findOne({ _id: '420803245758480405' })
			.then(async dsf => {
				const modChannel = client.channels.cache.get('643109949114679317');
				const embed = new Discord.MessageEmbed()
					.setTitle('Reaction Spammers Incoming!')
					.setDescription('Threholds are 10 reactions clicked (can be the same one) or 5 different reactions clicked. Clicking any of the reactions will update the post, though it will be updated everytime someone reacts to any of the messages listed below.')
					.setColor(colors.orange)
					.setTimestamp();

				// TODO - Check for double messages and remove the second/last one

				const embeds = dsf.merchChannel.spamProtection.flatMap(obj => {
					const usersList = obj.users.map(userObj => {
						// userObj = User, total count, skull count, reactions[]
						let skullsCount = 0;
						userObj.reactions.filter(r => {
							if (['☠️', '💀', '<:skull:805917068670402581>'].includes(r.emoji)) {
								skullsCount = skullsCount + r.count;
							}
						});
						return { totalCount: userObj.count, skullCount: skullsCount, user: { id: userObj.id, username: userObj.username }, reactions: userObj.reactions };
					});
					const dataFields = [];
					usersList.forEach(u => {
					// Filters added here
						if (u.totalCount > 9 || u.reactions.length > 4) {
							const emojis = u.reactions.map(e => { return `${e.emoji} **- ${e.count}**`; });
							dataFields.push({ name: `${u.user.username} - ${u.user.id}`, value: `Mention: <@!${u.user.id}>\nTotal Reacts (${u.skullCount}/${u.totalCount})\n\n${emojis.join('  |   ')}`, inline: true });
						}
						else { return; }
					});
					return dataFields;
				});

				if (embeds.length && !dsf.merchChannel.spamMessagePost.id.length) {
					const msg = await modChannel.send('<@!192082256079093761>, <@!310247495005634561>', embed.setFooter(`Page ${1} of ${embeds.length}`));
					await settings.findOneAndUpdate({ _id: '420803245758480405' }, {
						$set: {
							'merchChannel.spamMessagePost': { id: msg.id, timestamp: msg.createdTimestamp },
						},
					});
					await msg.react('◀️');
					await msg.react('▶️');
					dsfSpamMessage.stop();
				}
				else if (dsf.merchChannel.spamMessagePost.id.length) {
					dsfSpamMessage.stop();
				}
			});
	});

	// DSF Activity Posts //
	cron.schedule('0 */6 * * *', async () => {
		// cron.schedule('*/15 * * * * *', async () => { // Test
		const scout = new ScouterCheck('Scouter');
		const vScout = new ScouterCheck('Verified Scouter');

		// eslint-disable-next-line no-shadow
		const classVars = async (name, serverName, db) => {
			name._client = client;
			name._guild_name = serverName;
			name._db = await db.map(doc => {
				if (doc.serverName === name._guild_name) return doc;
			}).filter(x => x)[0];
			return name._client && name._guild_name && name._db;
		};
		const res = await settings.find({}).toArray();

		await classVars(scout, 'Deep Sea Fishing', res);
		await classVars(vScout, 'Deep Sea Fishing', res);
		// await classVars(scout, `Luke's Server`, res) // Test
		// await classVars(vScout, `Luke's Server`, res) // Test

		const addedRoles = async (name) => {
			const members = await name.checkRolesAdded(); // Role has been added
			members.map(async x => {
				const role = await name.role;
				await settings.updateOne({ serverName: name._guild_name, 'merchChannel.scoutTracker.userID': x.id }, {
					$addToSet: {
						'merchChannel.scoutTracker.$.assigned': role.id,
					},
				});
			});
		};
		const removedRoles = async (name) => {
			const checkRoles = await name.checkRolesRemoved();
			checkRoles.map(async x => {
				const role = await name.role;
				await settings.updateOne({ serverName: name._guild_name, 'merchChannel.scoutTracker.userID': x.id }, {
					$pull: {
						'merchChannel.scoutTracker.$.assigned': role.id,
					},
				});
			});
		};

		const removeInactives = async (name) => {
			const inactives = await name.removeInactive();
			const many = inactives.length;
			const manyNames = [];
			inactives.map(async doc => {
				manyNames.push(`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count})`);
				await settings.updateOne(
					{ serverName: name._guild_name },
					{ $pull: { 'merchChannel.scoutTracker': { 'userID': doc.userID } } },
				);
			});
			if (manyNames.length) {
				return client.channels.cache.get('731997087721586698').send(`${many} profiles removed.\n\`\`\`${manyNames.join('\n')}\`\`\``);
			}
		};

		[scout, vScout].forEach(x => {
			addedRoles(x);
			removedRoles(x);
		});
		removeInactives(scout);

		if (new Date().getDay() === 3 && new Date().getHours() === 00 && new Date().getMinutes() === 00) { // Weekly reset
			scout.send();
			vScout.send();
		}

		if (new Date().getDay() === 2 && new Date().getHours() === 00 && new Date().getMinutes() === 00) { // Monthly reset + 1 day
			await settings.updateMany({ lottoSheet: { $exists: true } }, { $set: { lottoSheet: null } });
		}

		// Reset Info Count back to 0 to allow use of command

		await settings.find({}).toArray().then(r => {
			r = r.filter(doc => doc.resetInfoCount >= 0);
			for (const doc in r) {
				if (r[doc].resetInfoCount === 1 && r[doc].resetInfoTime < r[doc].resetInfoTime + 86400000) {
					return settings.updateOne({ 'serverName': r[doc].serverName }, {
						$set: {
							resetInfoCount: 0,
						},
					});
				}
			}
		});

	});
};
