/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const Discord = require("discord.js");
const connection = require("../../mongodb").initDb;
const getDb = require("../../mongodb").getDb;
const fetch = require("node-fetch");
const randomColor = Math.floor(Math.random() * 16777215).toString(16);

module.exports = async client => {
	console.log("Ready!");

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

		let db = getDb();
		db.createCollection("Users");
		const collection = db.collection("Users");

		collection.updateMany(
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

		async () => {
			db = getDb();
			const vFactsColl = db.collection("Facts");
			const count = await vFactsColl.stats()
				.then(res => {
					return res.count;
				});
			const random = Math.floor((Math.random() * count) + 1);
			vFactsColl.findOne({ number: random })
				.then(res => {
					client.channels.cache.get("731324153356877825").send(res.Message);
				});
		};
		const daily = 24 * 60 * 60 * 1000;
		const hour = 60 * 60 * 1000;
		const minute = 60 * 1000;

		setInterval(async () => {
			db = getDb();
			const vFactsColl = db.collection("Facts");
			const count = await vFactsColl.stats()
				.then(res => {
					return res.count;
				});

			// Change the @Valence Team tag
			const factEmbed = function(factMessage) {
				const embed = new Discord.MessageEmbed()
					.setTitle("**Daily Valence Fact**")
					.setDescription(factMessage)
					.setColor(`#${randomColor}`)
					.addField("**Sent By:**", "<@&685612946231263232>", true)
					.setTimestamp();
				return embed;
			};

			const random = Math.floor((Math.random() * count) + 1);
			vFactsColl.findOne({ number: random })
				.then(res => {
					client.channels.cache.get("731324153356877825").send(factEmbed(res.Message));
					client.channels.cache.get("501146013780672523").send(factEmbed(res.Message));
					console.log(res.Message);
				});
		}, minute);
	});
};