/* eslint-disable no-unused-vars */
/* eslint-disable no-octal */
const getDb = require('../../mongodb').getDb;
const cron = require('node-cron');
const { msCalc, doubleDigits, nextDay } = require('../../functions');
const { sendFact } = require('../../valence/dailyFact');
const { updateRoles } = require('../../valence/clanData');
const { scout, vScout, classVars, addedRoles, removedRoles, removeInactives } = require('../../dsf/scouts/scouters');
const { updateStockTables } = require('../../dsf/stockTables');
const { skullTimer } = require('../../dsf/merch/merchChannel/skullTimer');
const { MessageEmbed, Formatters } = require('discord.js');
const colors = require('../../colors.json');

module.exports = async client => {
	console.log('Ready!');

	client.user.setPresence({
		status: 'idle',
		activities: [{ type: 'LISTENING', name: 'DMs for queries regarding the bot.' }],
	});

	const db = await getDb();
	const settings = db.collection('Settings');
	const users = db.collection('Users');
	const { channels: { errors, logs } } = await settings.findOne({ _id: 'Globals' }, { projection: { channels: { errors: 1, logs: 1 } } });
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const channels = {
		errors: {
			id: errors,
			embed: function(err, module) {
				const fileName = module.id.split('\\').pop();
				const embed = new MessageEmbed()
					.setTitle(`An error occured in ${fileName}`)
					.setColor(colors.red_dark)
					.addField(`${err.message}`, `${Formatters.codeBlock(err.stack)}`);
				return embed;
			},
			send: function(...args) {
				const channel = client.channels.cache.get(this.id);
				return channel.send(this.embed(...args));
			},
		},
		logs: {
			id: logs,
			send: function(content) {
				const channel = client.channels.cache.get(this.id);
				return channel.send({ content });
			},
		},
	};

	const formatTemplate = (data) => {
		const headers = { clanMate: 'Name', clanRank: 'Rank', totalXP: 'Total XP', kills: 'Kills' };
		let dataChanged = data[0].potentialNewNames.map(o => { return { clanMate: o.clanMate, clanRank: o.clanRank, totalXP: o.totalXP, kills: o.kills }; });
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
		dataChanged.splice(0, 0, `These are potential previous names for ${data[0].clanMate}.\n`);
		dataChanged.push(' ', 'Reactions:\n✅ Takes the primary suggestion suggestion.\n❌ Not changed names or none match.\n📝 Pick another suggestion.');
		return dataChanged.join('\n');
	};

	const postData = async (data) => {
		const messageSend = await channels.logs.send(`${Formatters.codeBlock(formatTemplate(data))}`);
		await messageSend.react('✅');
		await messageSend.react('❌');
		await messageSend.react('📝');

		await settings.updateOne({ _id: messageSend.guild.id }, { $addToSet: { nameChange: {
			messageID: messageSend.id,
			data,
		} } });
	};

	cron.schedule('0 10 * * *', async () => {
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

	const stream = users.watch({ fullDocument: 'updateLookup' });
	stream.on('change', next => {
		if (next.updateDescription) {
			const updated = next.updateDescription.updatedFields;
			if ('potentialNewNames' in updated) {
				postData([next.fullDocument]);
			}
		}
	});

	// If node cycling:
	(async function() {
		const { merchChannel: { channelID } } = await settings.findOne({ _id: '420803245758480405' }, { projection: { merchChannel: { channelID: 1 } } });
		const merchantChannel = client.channels.cache.get(channelID);
		let message = await merchantChannel.messages.fetch({ limit: 1 });
		message = message.first();
		skullTimer(message, settings, channels);
	})();


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
			const allUsers = await users.find({}).toArray();
			let index = 0;
			while (index < allUsers.length) {
				updateRoles(client, allUsers[index]);
				index++;
			}
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
