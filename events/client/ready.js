/* eslint-disable no-octal */
const getDb = require('../../mongodb').getDb;
const cron = require('node-cron');
const { msCalc, doubleDigits, nextDay } = require('../../functions');
const { postData } = require('../../scheduler/clan');
const { sendFact } = require('../../valence/dailyFact');
const { scout, vScout, classVars, addedRoles, removedRoles, removeInactives } = require('../../dsf/scouts/scouters');
const { updateStockTables } = require('../../dsf/stockTables');

module.exports = async client => {
	console.log('Ready!');

	client.user.setPresence({
		status: 'idle',
		activity: { type: 'LISTENING', name: 'DMs for Bot Help!' },
	});

	const db = getDb();
	const settings = await db.collection('Settings');
	const users = await db.collection('Users');
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	cron.schedule('0 10 * * *', async () => {
		sendFact(client);
	});
	postData(client, settings, users);

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
					const time = msCalc(days, doubleDigits(hours), doubleDigits(minutes)) + timer;
					return new Date(time).toUTCString();
				};
				await settings.find({}).toArray().then(res => {
					const dayNum = days.indexOf(res[document].citadel_reset_time.day);
					const resetString = nextDay(dayNum).toUTCString().split(' ');
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
									client.channels.cache.get(res[document].citadel_reset_time.reminders[remDoc].channel).send(`${res[document].citadel_reset_time.reminders[remDoc].message}\`\`\`You can also help out with setting the Citadel Reset Time since it changes almost every single week! Use the following command to let your Clan Admins know the next Citadel Reset:\n\n${res[document].prefix}citadel reset info <days> <hours> <minutes> <image (optional)>\n\nExample:\n${res[document].prefix}citadel reset info 6 22 42\`\`\``);
								}
							}
						}
					}
				});
				// Will continue to be on/off and won't switch until the bot resets
			}, { scheduled: r[document].citadel_reset_time.scheduled });
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


	// DSF Activity Posts //
	cron.schedule('0 */6 * * *', async () => {
		const res = await settings.find({}).toArray();
		await classVars(scout, 'Deep Sea Fishing', res, client);
		await classVars(vScout, 'Deep Sea Fishing', res, client);

		[scout, vScout].forEach(role => {
			addedRoles(role, settings);
			removedRoles(role, settings);
		});
		removeInactives(scout, client, settings);

		// Daily Reset
		if (new Date().getHours() === 00 && new Date().getMinutes() === 00) {
			updateStockTables(client, settings);
		}

		// Weekly reset
		if (new Date().getDay() === 3 && new Date().getHours() === 00 && new Date().getMinutes() === 00) {
			scout.send();
			vScout.send();
			await getData(client);
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
