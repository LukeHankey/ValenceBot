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

const postData = async (client, settings, users) => {
	const channelToSend = client.channels.cache.get('731997087721586698');
	const potentialNameChanges = await users.find({ potentialNewNames: { $exists: true } }).project({ clanMate: 1, clanRank: 1, totalXP: 1, kills: 1, _id: 0, potentialNewNames: 1 }).toArray();
	/**
	 * For each potential name change, pass data as an array of objects to format
	 */

	const messageSend = await channelToSend.send(`\`\`\`${formatTemplate(potentialNameChanges)}\`\`\``);
};

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
	return dataChanged.join('\n');
};

cron.schedule('*/10 * * * * *', async () => {
	// await getData();
	// await addActive();
	await postData();
});

module.exports = {
	postData,
};