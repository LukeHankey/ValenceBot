/* eslint-disable no-octal */
const Discord = require('discord.js');
const getDb = require('../../mongodb').getDb;
const cron = require('node-cron');
const randomColor = Math.floor(Math.random() * 16777215).toString(16);
const func = require('../../functions');
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
	const db = getDb();
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
				// #test-channel & #good-chats
				const ID = ['732014449182900247', '473235620991336468'];

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
				// Will continue to be on/off and won't switch until the bot resets
			}, { scheduled: r[document].citadel_reset_time.scheduled });
		}
	});

	const commandCollection = client.commands.filter(cmd => cmd.name === 'wish' || cmd.name === 'future');
	const commands = commandCollection.first(2);

	// Daily reset
	cron.schedule('58 23 * * *', async () => {
		const { merchantWishes: { range }, futureStock } = await settings.findOne({ _id: '420803245758480405' }, { projection: { 'merchantWishes.range': 1, futureStock: 1 } });

		const increaseRange = (oldRange) => {
			const split = oldRange.split(':');
			const newNum = split.map(val => {
				const valueStr = val.slice(1);
				return Number(valueStr) + 1;
			});
			return `A${newNum[0]}:E${newNum[1]}`;
		};

		console.log('Running reset tasks.', `old wish range: ${range}`, `new wish range: ${increaseRange(range)}`, `old future range: ${futureStock.range}`, `new future range: ${increaseRange(futureStock.range)}`);
		await settings.updateOne({ _id: '420803245758480405' }, {
			$set: {
				'merchantWishes.range': increaseRange(range),
			},
		});
		await settings.updateOne({ _id: '420803245758480405' }, {
			$set: {
				'futureStock.range': increaseRange(futureStock.range),
			},
		});
		// Future
		await commands[0].run(client, 'readyEvent');
		// Wish
		await commands[1].run(client, 'readyEvent');
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
			const members = await name.checkRolesAdded();
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

		console.log(new Date().getHours());

		// Weekly reset
		if (new Date().getDay() === 3 && (new Date().getHours() === 01 || new Date().getHours() === 00) && new Date().getMinutes() === 00) {
			scout.send();
			vScout.send();
		}

		// Monthly reset + 1 day
		if (new Date().getDate() === 2 && (new Date().getHours() === 01 || new Date().getHours() === 00) && new Date().getMinutes() === 00) {
			console.log(new Date().getDate(), 'Setting lottoSheet to Null');
			await settings.updateMany({ gSheet: { $exists: true } }, { $set: { lottoSheet: null } });
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
