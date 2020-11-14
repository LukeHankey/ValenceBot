const Discord = require("discord.js");
const getDb = require("../../mongodb").getDb;
const fetch = require("node-fetch");
const cron = require('node-cron');
const randomColor = Math.floor(Math.random() * 16777215).toString(16);
const func = require("../../functions")
const { ScouterCheck } = require('../../classes.js')

module.exports = async client => {
	console.log("Ready!");

	client.user.setPresence({
		status: "idle",
		activity: { type: "WATCHING", name: "Over Valence" }
	})

	const factEmbed = function (factMessage) {
		const embed = new Discord.MessageEmbed()
			.setTitle("**Daily Valence Fact**")
			.setDescription(factMessage)
			.setColor(`#${randomColor}`)
			.addField("**Sent By:**", "<@&685612946231263232>", true)
			.setTimestamp();
		return embed;
	};

	function csvJSON(csv) {

		const lines = csv.split("\n");
		const result = [];
		const headers = lines[0].split(",");

		for (let i = 1; i < lines.length; i++) {
			const obj = {};
			const currentline = lines[i].split(",");

			for (let j = 0; j < headers.length; j++) {
				obj[headers[j]] = currentline[j];
			}

			result.push(obj);
		}

		// return result; //JavaScript object
		return JSON.parse(JSON.stringify(result)); // JSON
	}

	const db = getDb();
	const usersColl = db.collection("Users");

	const getData = async () => {
		const clanData = await fetch("http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Valence");
		const text = clanData.text();
		const json = text.then(body => csvJSON(body));

		json.then(res => {
			const newData = [];

			for (data of res) {
				const regex = /�/g;
				if ((data.Clanmate).includes("�")) {
					data.Clanmate = data.Clanmate.replace(regex, " ") || data.Clanmate;
				}
				newData.push(data);
			}

			newData.forEach(e => {
				e._id = e.Clanmate.toUpperCase();
			});
			usersColl.insertMany(newData, { ordered: false });
		})
			.catch(error => console.error(error));
	}
	// getData()

	usersColl.updateMany(
		{},
		{
			$set:
			{
				"Caps": 0,
				"Total Points": 0,
				"Events": 0,
				"Recruits": 0,
				"Additional Points": 0,
				"Donations": 0,
				"Hosts": 0,
				"Events & Recruits": 0,
				"Rank Earned": "",
				"Donation Points": 0,
			},
		},
		{ upsert: true },
	);

	const vFactsColl = await db.collection("Facts");
	const settings = await db.collection("Settings");
	const code = "```";
	cron.schedule('0 10 * * *', async () => {
		const count = await vFactsColl.stats()
			.then(res => {
				return res.count;
			});
		const random = Math.floor((Math.random() * count) + 1);

		vFactsColl.findOne({ number: random })
			.then(res => {
				const ID = ["732014449182900247", "473235620991336468"] //#test-channel & #good-chats

				ID.forEach(channel => {
					client.channels.cache.get(channel).send(factEmbed(res.Message));
				})
			});
	});

	let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

	// Citadel Server Reminders //
	await settings.find({}).toArray().then(r => {
		for (const document in r) {
			cron.schedule(`*/1 * * * *`, async () => {
				let today = new Date();
				let today_num = today.getUTCDay();
				let today_str = days[today_num];
				const newDates = function (days, hours, minutes, timer) {
					let time = func.msCalc(days, func.doubleDigits(hours), func.doubleDigits(minutes)) + timer;
					return new Date(time).toUTCString()
				}
				await settings.find({}).toArray().then(res => {
					let dayNum = days.indexOf(res[document].citadel_reset_time.day);
					let resetString = func.nextDay(dayNum).toUTCString().split(" ")
					resetString.splice(4, 1, `${res[document].citadel_reset_time.hour}:${res[document].citadel_reset_time.minute}:00`)
					let resetms = Date.parse(resetString.join(" "))

					let reminders = res[document].citadel_reset_time.reminders;
					for (const remDoc in reminders) {
						if (reminders[remDoc].dayReset === "reset") {
							let newDate = newDates(reminders[remDoc].dayResetPlus, reminders[remDoc].hourResetPlus, reminders[remDoc].minResetPlus, resetms);
							let dateDays = newDate.split(" ")[0].slice(0, 3);
							let dateHours = newDate.split(" ")[4].slice(0, 2);
							let dateMins = newDate.split(" ")[4].slice(3, 5);

							if (dateDays === today_str.substr(0, 3)) {
								if (today.getUTCHours() == +dateHours) {
									if (+dateMins <= today.getUTCMinutes() && today.getUTCMinutes() < (+dateMins + 1)) {
										client.channels.cache.get(res[document].citadel_reset_time.reminders[remDoc].channel).send(`${res[document].citadel_reset_time.reminders[remDoc].message}`)
									}
								}
							}
						}
						else {
							if (res[document].citadel_reset_time.day === today_num || res[document].citadel_reset_time.day === today_str || res[document].citadel_reset_time.day === today_str.substr(0, 3)) {
								if (today.getUTCHours() == res[document].citadel_reset_time.hour) {
									if (res[document].citadel_reset_time.minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].citadel_reset_time.minute + 1)) {
										client.channels.cache.get(res[document].channels.adminChannel).send("@here - Set the Citadel Reset Time!")
										client.channels.cache.get(res[document].citadel_reset_time.reminders[remDoc].channel).send(`${res[document].citadel_reset_time.reminders[remDoc].message}${code}You can also help out with setting the Citadel Reset Time since it changes almost every single week! Use the following command to let your Clan Admins know the next Citadel Reset:\n\n${res[document].prefix}citadel reset info <days> <hours> <minutes> <image (optional)>\n\nExample:\n${res[document].prefix}citadel reset info 6 22 42${code}`)
									}
								}
							}
						}
					}
				})
			}, { scheduled: r[document].citadel_reset_time.scheduled }) // Will continue to be on/off and won't switch until the bot resets
		}
	})

	// Normal Server Reminders //
	cron.schedule(`*/5 * * * *`, async () => {
		let today = new Date();
		let today_num = today.getDay();
		let today_str = days[today_num];
		await settings.find({}).toArray().then(res => {
			for (const document in res) {
				for (const remDoc in res[document].reminders) {
					if (res[document].reminders[remDoc].day !== undefined) {
						if (+res[document].reminders[remDoc].day === today_num || res[document].reminders[remDoc].day.toLowerCase() === today_str.toLowerCase() || res[document].reminders[remDoc].day.toLowerCase() === today_str.substr(0, 3).toLowerCase()) {
							if (today.getUTCHours() == +res[document].reminders[remDoc].hour) {
								if (+res[document].reminders[remDoc].minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].reminders[remDoc].minute + 1)) {
									client.channels.cache.get(res[document].reminders[remDoc].channel).send(res[document].reminders[remDoc].message)
								}
							}
						}
					}
				}
			}
		})
	})

	// DSF Activity Posts //
	cron.schedule('*/10 * * * * *', async () => {
		// cron.schedule('* */6 * * *', async () => {
		let scout = new ScouterCheck('Scouter')
		let vScout = new ScouterCheck('Verified Scouter')

		const classVars = async (name, serverName, db) => {
			name._client = client;
			name._guild_name = serverName;
			name._db = await db.map(doc => {
				if (doc.serverName === name._guild_name) return doc
			}).filter(x => x)[0]
			return name._client && name._guild_name && name._db
		}
		const res = await settings.find({}).toArray()

		await classVars(scout, `Luke's Server`, res)
		await classVars(vScout, `Luke's Server`, res)

		const addedRoles = async (name) => {
			const members = await name.checkRolesAdded() // Role has been added
			members.map(async x => {
				const role = await name.role
				await settings.updateOne({ serverName: name._guild_name, 'merchChannel.scoutTracker.userID': x.id }, {
					$addToSet: {
						'merchChannel.scoutTracker.$.assigned': role.id
					}
				})
			})
		}
		const removedRoles = async (name) => {
			const checkRoles = await name.checkRolesRemoved()
			checkRoles.map(async x => {
				const role = await name.role
				await settings.updateOne({ serverName: name._guild_name, 'merchChannel.scoutTracker.userID': x.id }, {
					$pull: {
						'merchChannel.scoutTracker.$.assigned': role.id
					}
				})
			})
		}
		addedRoles(scout)
		addedRoles(vScout)
		removedRoles(scout)
		removedRoles(vScout)

		if (new Date().getSeconds() === 30 || new Date().getSeconds() === 00) {
			scout.send()
			vScout.send()
		}
	})
};
