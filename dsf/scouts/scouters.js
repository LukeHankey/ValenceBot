const { ScouterCheck } = require('../../classes');
const getDb = require('../../mongodb').getDb;
const scout = new ScouterCheck('Scouter');
const vScout = new ScouterCheck('Verified Scouter');

const db = getDb();

const classVars = async (name, serverName, database, client) => {
	name._client = client;
	name._guild_name = serverName;
	name._db = await database.map(doc => {
		if (doc.serverName === name._guild_name) return doc;
	}).filter(x => x)[0];
	return name._client && name._guild_name && name._db;
};

const addedRoles = async (name) => {
	const settings = await db.collection('Settings');
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
const removedRoles = async (name) => {
	const settings = await db.collection('Settings');
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

const removeInactives = async (name, client) => {
	const settings = await db.collection('Settings');
	const inactives = await name.removeInactive();
	const many = inactives.length;
	const manyNames = [];
	inactives.map(async doc => {
		manyNames.push(`${doc.author} - ${doc.userID} (${doc.count + doc.otherCount} - M${doc.count})`);
		await settings.updateOne(
			{ serverName: name._guild_name },
			{ $pull: { 'merchChannel.scoutTracker': { 'userID': doc.userID } } },
		);
	});
	if (manyNames.length) {
		return client.channels.cache.get('731997087721586698').send(`${many} profiles removed.\n\`\`\`${manyNames.join('\n')}\`\`\``);
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