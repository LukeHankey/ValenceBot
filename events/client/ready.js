/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const Discord = require("discord.js");
const connection = require("../../mongodb").initDb;
const getDb = require("../../mongodb").getDb;
const fetch = require("node-fetch");
const cron = require('node-cron');
const randomColor = Math.floor(Math.random() * 16777215).toString(16);

module.exports = async client => {
	console.log("Ready!");

	const factEmbed = function(factMessage) {
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

		for(let i = 1;i < lines.length;i++) {
			const obj = {};
			const currentline = lines[i].split(",");

			for(let j = 0;j < headers.length;j++) {
				obj[headers[j]] = currentline[j];
			}

			result.push(obj);
		}

		// return result; //JavaScript object
		return JSON.parse(JSON.stringify(result)); // JSON
	}

	async function getData() {
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
			collection.insertMany(newData);
		})
			.catch(error => console.error(error));
	}
	connection(async err => {
		if (err) console.log(err);
		const db = getDb();
		const vFactsColl = db.collection("Facts");
		const settings = db.collection("Settings");
		db.createCollection("Users");
		const code = "```";

		const usersColl = db.collection("Users");
		usersColl.updateMany(
			{},
			{ $set:
			{ "Caps": 0,
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

	await settings.find({}).toArray().then(r => {
		for (const document in r) {
			cron.schedule(`*/1 * * * *`, async () => {
				let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
				let today = new Date();
				let today_num = today.getUTCDay();
				let today_str = days[today_num];
				await settings.find({}).toArray().then(res => {
					for (const remDoc in res[document].citadel_reset_time.reminders) {
						if (res[document].citadel_reset_time.day === today_num || res[document].citadel_reset_time.day === today_str || res[document].citadel_reset_time.day === today_str.substr(0, 3) ) {
							if (today.getUTCHours() == res[document].citadel_reset_time.hour) {
								if (res[document].citadel_reset_time.minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].citadel_reset_time.minute + 1)) {
									client.channels.cache.get(res[document].channels.adminChannel).send("@here - Set the Citadel Reset Time!")
									client.channels.cache.get(res[document].citadel_reset_time.reminders[remDoc].channel).send(`${res[document].citadel_reset_time.reminders[remDoc].message}${code}You can also help out with setting the Citadel Reset Time since it changes almost every single week! Use the following command to let your Clan Admins know the next Citadel Reset:\n\n${res[document].prefix}citadel reset info <days> <hours> <minutes>\n\nExample:\n${res[document].prefix}citadel reset info 6 22 42${code}`)
								}
							}
						}
					}
				})
			},	{ scheduled: r[document].citadel_reset_time.scheduled }) // Will continue to be on/off and won't switch until the bot resets
		}
		})

		cron.schedule(`*/5 * * * *`, async () => {
			let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
			let today = new Date();
			let today_num = today.getDay();
			let today_str = days[today_num];
			await settings.find({}).toArray().then(res => {
				for (const document in res) {	
					for (const remDoc in res[document].reminders) {
						if (res[document].reminders[remDoc].day !== undefined) {
							if (+res[document].reminders[remDoc].day === today_num || res[document].reminders[remDoc].day.toLowerCase() === today_str.toLowerCase() || res[document].reminders[remDoc].day.toLowerCase() === today_str.substr(0, 3).toLowerCase() ) {
								if (today.getUTCHours() == +res[document].reminders[remDoc].hour) {
									if (+res[document].reminders[remDoc].minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].reminders[remDoc].minute + 5)) {
										client.channels.cache.get(res[document].reminders[remDoc].channel).send(res[document].reminders[remDoc].message)
									}
								}
							}
						}
					}
				}
			})
		})

		// cron.schedule(`*/2 * * * *`, async () => {
			// client.channels.cache.get("718218491257290823").send("@here - Set the Citadel Locks & Targets!")
		// })

	});
};
