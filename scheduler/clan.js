const fetch = require('node-fetch');
const { csvJSON, renameKeys } = require('../functions');
require('dotenv').config();
const { initDb, getDb } = require('../mongodb');
const cron = require('node-cron');
initDb(err => { if (err) console.error(err);});
const { nameChanges, addActive } = require('./users');

const getData = async () => {
	const db = await getDb();
	const usersColl = db.collection('Users');
	const clanData = await fetch('http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Valence');
	const text = clanData.text();
	const json = text.then(body => csvJSON(body));

	json.then(async res => {
		const newData = [];

		for (const info of res) {
			const regex = /�/g;
			if ((info.Clanmate).includes('�')) {
				info.Clanmate = info.Clanmate.replace(regex, ' ') || info.Clanmate;
			}
			newData.push(info);
		}


		newData.forEach(async clanUser => {
			clanUser = renameKeys({ 'Clanmate': 'clanMate', ' Clan Rank': 'clanRank', ' Total XP': 'totalXP', ' Kills': 'kills' }, clanUser);
			clanUser.discord = '';
			clanUser.discActive = false;
			clanUser.alt = false;
			clanUser.gameActive = false;
			const dbCheck = await usersColl.findOne({ 'clanMate': clanUser.clanMate });
			if (!dbCheck) {
				if (clanUser.clanMate === '') return;
				clanUser.gameActive = 'undefined';
				await usersColl.insertOne(clanUser);
			}
			else {
				// Updates total XP
				await usersColl.updateOne({ clanMate: clanUser.clanMate }, { $set: { clanRank: clanUser.clanRank, totalXP: clanUser.totalXP, kills: clanUser.kills } });
			}
		});

		let allUsers = await usersColl.find({}).project({ clanMate: 1, _id: 0 }).toArray();
		allUsers = allUsers.map(user => user.clanMate);
		const newDataNames = newData.map(user => user.Clanmate);
		const missingNames = allUsers.filter(name => !newDataNames.includes(name));
		await nameChanges(missingNames);
	})
		.catch(error => console.error(error));
};

// Wednesday at 10am
cron.schedule('0 10 * * 3', async () => {
	await addActive();
});

// Daily at 10am
cron.schedule('0 10 * * *', async () => {
	await getData();
});