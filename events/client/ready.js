/* eslint-disable no-octal */
const getDb = require('../../mongodb').getDb;
const cron = require('node-cron');
const { msCalc, doubleDigits, nextDay, removeMessage } = require('../../functions');
const { sendFact } = require('../../valence/dailyFact');
const { scout, vScout, classVars, addedRoles, removedRoles, removeInactives } = require('../../dsf/scouts/scouters');
const { updateStockTables } = require('../../dsf/stockTables');

module.exports = async client => {
	console.log('Ready!');

	client.user.setPresence({
		status: 'idle',
		activity: { type: 'LISTENING', name: 'DMs for Bot Help!' },
	});

	const db = await getDb();
	const settings = db.collection('Settings');
	const users = db.collection('Users');
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const formatTemplate = (data) => {
		const headers = { clanMate: 'Name', clanRank: 'Rank', totalXP: 'Total XP', kills: 'Kills' };
		let dataChanged = data.map(o => { return { clanMate: o.clanMate, clanRank: o.clanRank, totalXP: o.totalXP, kills: o.kills }; });
		dataChanged.splice(0, 0, headers);

		const padding = (str, start = false, max) => {
			if (start) {
				str = str.padStart(str.length, '| ');
			}
			const strMax = str.padEnd(max, ' ');
			return strMax.concat(' | ');
		};
		dataChanged = dataChanged.map((profile) => {
			return `${padding(profile.clanMate, true, Math.max(...(dataChanged.map(el => el.clanMate.length))))}${padding(profile.clanRank, false, Math.max(...(dataChanged.map(el => el.clanRank.length))))}${padding(profile.totalXP, false, Math.max(...(dataChanged.map(el => el.totalXP.length))))}${padding(profile.kills, false, Math.max(...(dataChanged.map(el => el.kills.length))))}`;
		});
		dataChanged.splice(0, 0, `These are potential previous names for ${data[0].potentialNewNames[0].clanMate}.\n`);
		dataChanged.push(' ', 'Reactions:\n✅ Takes the primary suggestion suggestion.\n❌ Not changed names or none match.\n📝 Pick another suggestion.');
		return dataChanged.join('\n');
	};

	const postData = async () => {
		const channelToSend = client.channels.cache.get('731997087721586698');
		const potentialNameChanges = await users.find({ potentialNewNames: { $exists: true } }).toArray();
		if (!potentialNameChanges.length) return;
		const messageSend = await channelToSend.send(`\`\`\`${formatTemplate(potentialNameChanges)}\`\`\``);
		await messageSend.react('✅');
		await messageSend.react('❌');
		await messageSend.react('📝');

		settings.updateOne({ _id: channelToSend.guild.id }, { $set: { nameChange: [{
			messageID: messageSend.id,
			data: potentialNameChanges,
		}] } });
	};

	cron.schedule('0 10 * * *', async () => {
		postData();
		sendFact(client);
	});

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

	// If node cycling:
	const setSkulls = async () => {
		const { merchChannel: { spamProtection, channelID } } = await settings.findOne({ _id: '420803245758480405' }, { projection: { merchChannel: { spamProtection: 1, channelID: 1 } } });
		const merch = client.channels.cache.get(channelID);
		spamProtection.forEach(async item => {
			const msg = await merch.messages.fetch(item.messageID);
			if (msg.reactions.cache.has('☠️')) { return; }
			else if (Date.now() - msg.createdTimestamp >= 600000 && !msg.reactions.cache.has('☠️')) {
				await msg.react('☠️');
				const message = {
					guild: {
						id: '420803245758480405',
					},
				};
				return await removeMessage(message, msg, settings);

			}
			else { return; }
		});
	};
	await setSkulls();


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
