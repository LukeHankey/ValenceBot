const getDb = require('../mongodb').getDb;

const clanRoles = {
	recruit: '473234580904607745',
	corporal: '473234334342578198',
	sergeant: '473233680161046528',
	lieutenant: '473233520773300257',
	captain: '473233412925292560',
	general: '473232083628720139',
};

const updateRoles = async (client, dbCheck) => {
	const db = getDb();
	const usersColl = db.collection('Users');
	const channel = client.channels.cache.get('860930368994803732');
	const adminRoles = ['Admin', 'Organiser', 'Coordinator', 'Overseer', 'Deputy Owner', 'Owner'];

	if (adminRoles.includes(dbCheck.clanRank) || !dbCheck.discActive || dbCheck.alt) {return;}
	else {
		const setRoles = async (newRole, oldRole) => {
			await getMember.roles.add(newRole);
			await getMember.roles.remove(oldRole.id);
		};
		const server = client.guilds.cache.get('472448603642920973');
		const getMember = server.members.cache.get(dbCheck.discord) ?? await server.members.fetch(dbCheck.discord).catch(async err => {
			channel.send(`Unable to fetch user (${dbCheck.clanMate} - ${dbCheck.discord}) - Left the discord and marking as inactive.\`\`\`${err}\`\`\``);
			return await usersColl.updateOne({ clanMate: dbCheck.clanMate }, { $set: { discActive: false } });
		});
		let role = getMember.roles.cache.filter(r => {
			const keys = Object.keys(clanRoles);
			return keys.find(val => r.name.toLowerCase() == val);
		});
		if (!role.size) return channel.send(`Unable to find role name as ${getMember.user.username} (${getMember.id}) has no rank roles.`);
		if (role.size > 1) return channel.send(`${getMember} (${getMember.id}) has more than 1 rank role.`);
		role = role.first();
		if (role.name !== dbCheck.clanRank) {
			switch(dbCheck.clanRank) {
			case 'General':
				await setRoles(clanRoles.general, role);
				console.log('General:', dbCheck.clanMate, role.name, dbCheck.clanRank);
				break;
			case 'Captain':
				await setRoles(clanRoles.captain, role);
				console.log('Captain:', dbCheck.clanMate, role.name, dbCheck.clanRank);
				break;
			case 'Lieutenant':
				await setRoles(clanRoles.lieutenant, role);
				console.log('Lieutenant:', dbCheck.clanMate, role.name, dbCheck.clanRank);
				break;
			case 'Sergeant':
				await setRoles(clanRoles.sergeant, role);
				console.log('Sergeant:', dbCheck.clanMate, role.name, dbCheck.clanRank);
				break;
			case 'Corporal':
				await setRoles(clanRoles.corporal, role);
				console.log('Corporal:', dbCheck.clanMate, role.name, dbCheck.clanRank);
				break;
			case 'Recruit':
				await setRoles(clanRoles.recruit, role);
				console.log('Recruit:', dbCheck.clanMate, role.name, dbCheck.clanRank);
				break;
			}
		}
		else { return; }
	}
};

module.exports = {
	updateRoles,
};