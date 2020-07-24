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
			// console.log(e);
			});
			collection.insertMany(newData);
		})
			.catch(error => console.error(error));
	}
	connection(err => {
		if (err) console.log(err);
		const db = getDb();
		const vFactsColl = db.collection("Facts");
		const settings = db.collection("Settings");
		db.createCollection("Users");
		

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

	settings.find({}).toArray().then(res => {
		for (const document in res) {
			let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
			let today = new Date();
			let today_num = today.getDay();
			let today_str = days[today_num];
			cron.schedule(`*/5 * * * *`, async () => {
					if (res[document].citadel_reset_time.day === today_num || res[document].citadel_reset_time.day === today_str || res[document].citadel_reset_time.day === today_str.substr(0, 3) ) {
						if (today.getUTCHours() == res[document].citadel_reset_time.hour) {
							if (res[document].citadel_reset_time.minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].citadel_reset_time.minute + 5)) {
								client.channels.cache.get(res[document].channels.adminChannel).send("@here - Set the Citadel Reset Time!")
							}
						}
					}
			},	{ scheduled: res[document].citadel_reset_time.scheduled })
			cron.schedule(`*/5 * * * *`, async () => {
				console.log(res[document].reminders.day)
				if (res[document].reminders.day === today_num || res[document].reminders.day === today_str || res[document].reminders.day === today_str.substr(0, 3) ) {
					if (today.getUTCHours() == res[document].reminders.hour) {
						if (res[document].reminders.minute <= today.getUTCMinutes() && today.getUTCMinutes() < (+res[document].reminders.minute + 5)) {
							client.channels.cache.get(res[document].reminders.channel).send(`res[document].reminders.message`)
						}
					}
				}
			})
		}
		})

		// cron.schedule(`0 1 * * mon`, async () => {
		// 	client.channels.cache.get("718218491257290823").send("@here - Set the Citadel Locks & Targets!")
		// })
	});
};
