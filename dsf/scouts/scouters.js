const { ScouterCheck } = require('../../classes');
const scout = new ScouterCheck('Scouter');
const vScout = new ScouterCheck('Verified Scouter');
const { Util, Formatters } = require('discord.js');

const classVars = async (name, serverName, database, client) => {
	name._client = client
	name._guildName = serverName
	// eslint-disable-next-line array-callback-return
	name._db = await database.map(doc => {
		if (doc.serverName === name._guildName) return doc
	}).filter(x => x)[0]
}

const addedRoles = async (name, settings) => {
	const members = await name.checkRolesAdded();
	members.map(async x => {
		const role = await name.role;
		await settings.updateOne({ serverName: name._guild_name, 'merchChannel.scoutTracker.userID': x.id }, {
			$addToSet: {
				'merchChannel.scoutTracker.$.assigned': role.id,
			},
		});
	});
};
const removedRoles = async (name, settings) => {
	const checkRoles = await name.checkRolesRemoved();
	checkRoles.map(async x => {
		const role = await name.role;
		await settings.updateOne({ serverName: name._guild_name, 'merchChannel.scoutTracker.userID': x.id }, {
			$pull: {
				'merchChannel.scoutTracker.$.assigned': role.id,
			},
		});
	});
};

const removeInactives = async (name, settings, { logs }) => {
	const inactives = await name.removeInactive();
	const removed = [];
	const allItems = [];
	const sixMonths = 1.577e+10;
	inactives.map(async doc => {
		if (doc.active === 0 && (Date.now() - doc.lastTimestamp) > sixMonths) {
			removed.push(doc.author);
			allItems.push(`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count}).`);
			await settings.updateOne(
				{ serverName: name._guild_name },
				{ $pull: { 'merchChannel.scoutTracker': { 'userID': doc.userID } } },
			);
		}
		else if (doc.active === 0) {
			const timeStamp = doc.lastTimestampReadable.split(' ');
			allItems.push(`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count}). Last made a call on ${timeStamp.slice(0, 5)}.`);
			return;
		}
		else {
			allItems.push(`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count}). User has been marked as inactive.`);
			await settings.updateOne(
				{ serverName: name._guild_name, 'merchChannel.scoutTracker.userID': doc.userID },
				{ $set: { 'merchChannel.scoutTracker.$.active': 0 } },
			);
		}
	});
	if (allItems.length) {
		const split = Util.splitMessage(`${allItems.join('\n')}`);
		return split.forEach(content => logs.send(`${removed.length} profiles removed.\n${Formatters.codeBlock(content)}`));
	}
};

module.exports = {
	scout,
	vScout,
	classVars,
	addedRoles,
	removedRoles,
	removeInactives,
};