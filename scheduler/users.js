/**
 * Name change would be considered a new member
 * Check users rank. If > recruit, most likely a name change. Handle recruits differently.
 * Active check:
    * Function that grabs the players runemetrics profile > activities[0].date. Parse that and check if Date.now() - 1 month > parsed date. If so, then inactive at least 1 month.
        * Add to database profile gameActive: false
    * Corp+ :
    * Active check for members in the same rank. Compare XP + kills.
    * Hold all ^ member names in an array.
    * Send a message to a channel (currently bot logs) to have manual confirmation that changed name to y as a suggestion + list of other potential members based on comparing criteria.
    * If the primary suggestion, react with tick, if no name change react with x.
    * If not primary suggestion but is another suggestion, other reaction which awaits messages for a username specified in member array (lowercase).
    * Format message as Name | Rank | Total XP | Kills
                        xyz  | corp | 12345678 | 1
        * Equally spaced
* Recruit:
    * Active check
    * Compare kills and totalxp
    */

const fetch = require('node-fetch');
const getDb = require('../mongodb').getDb;

const addActive = async () => {
	const db = await getDb();
	const usersColl = db.collection('Users');
	const users = await usersColl.find({}).toArray();
	let index = 0;
	const interval = setInterval(async () => {
		try {
			const metricsProfile = await fetch(`https://apps.runescape.com/runemetrics/profile/profile?user=${users[index].clanMate}&activities=1`).then(response => response.json()).catch(console.error());
			let lastActivityDate;
			if (metricsProfile.error) {
				console.log(users[index].clanMate, metricsProfile.error);
				await usersColl.updateOne({ clanMate: users[index].clanMate }, { $set: { profile: metricsProfile.error, gameActive: null } });
			}
			else {
				lastActivityDate = metricsProfile.activities.length ? metricsProfile.activities[0].date : 0;
				lastActivityDate = Date.parse(lastActivityDate);

				if ((Date.now() - 2.628e+9) > lastActivityDate) {
					console.log(`${users[index].clanMate} is not active`);
					await usersColl.updateOne({ clanMate: users[index].clanMate }, { $set: { gameActive: false } });
				}
				else {
					console.log(`${users[index].clanMate} is active`);
					await usersColl.updateOne({ clanMate: users[index].clanMate }, { $set: { gameActive: true } });
				}
			}
			index++;
		}
		catch (err) {
			console.error(err);
		}

		if (index === users.length) {
			clearInterval(interval);
		}
	}, 1000);
};

const clanCheck = async (users) => {
	const db = await getDb();
	const usersColl = db.collection('Users');
	let index = 0;
	const interval = setInterval(async () => {
		try {
			let metricsProfile = await fetch(`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${users[index].clanMate}%22%5D&callback=jQuery000000000000000_0000000000&_=0`).then(response => response.text());
			metricsProfile = JSON.parse(metricsProfile.slice(34, -4));

			if (metricsProfile.clan && metricsProfile.clan !== 'Valence') {
				console.log(metricsProfile.name, 'has left Valence for', metricsProfile.clan);
				await usersColl.deleteOne({ clanMate: metricsProfile.name }, { justOne: true });
			}
			else {
				console.log(metricsProfile.name, 'still in Valence');
			}
			index++;
		}
		catch (err) {
			console.error(err);
		}

		if (index === users.length) {
			clearInterval(interval);
		}
	}, 1000);
};

const nameChanges = async (missingNames) => {
	const db = await getDb();
	const usersColl = db.collection('Users');

	const nameChange = {
		left: [],
		change: [],
	};

	for (const names of missingNames) {
		const potentialChangers = await usersColl.findOne({ clanMate: names });
		const potentialNewNames = await usersColl.find({ clanRank: potentialChangers.clanRank, kills: potentialChangers.kills, gameActive: 'undefined' }).toArray();
		if (!potentialNewNames.length) {
			nameChange.left.push(potentialChangers);
		}
		else {
			const xpCheck = potentialNewNames.map(user => {
				if (Number(user.totalXP) - 10000000 < Number(potentialChangers.totalXP) && Number(user.totalXP) + 10000000 > Number(potentialChangers.totalXP)) {
					return user;
				}
			});
			potentialChangers.potentialNewNames = xpCheck;
			nameChange.change.push(potentialChangers);
		}
	}

	if (nameChange.left.length) {
		return await clanCheck(nameChange.left);
	}
	if (nameChange.change.length) {
		return nameChange.change.forEach(async user => {
			console.log(`Updating ${user.clanMate} as they have potentially changed names`);
			return await usersColl.updateOne({ clanMate: user.clanMate }, { $set: { potentialNewNames: user.potentialNewNames } });
		});
	}


};

module.exports = {
	nameChanges,
	addActive,
};