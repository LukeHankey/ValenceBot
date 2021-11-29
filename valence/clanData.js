const clanRoles = {
	recruit: '473234580904607745',
	corporal: '473234334342578198',
	sergeant: '473233680161046528',
	lieutenant: '473233520773300257',
	captain: '473233412925292560',
	general: '473232083628720139'
}
const guestRole = '473265487581544448'
const adminRoles = ['Admin', 'Organiser', 'Coordinator', 'Overseer', 'Deputy Owner', 'Owner']
const setRoles = async (member, newRole, oldRole) => {
	await member.roles.add(newRole)
	await member.roles.remove(oldRole.id)
}

export const updateRoles = async (client, dbCheck, server, channels, users) => {
	const errors = client.channels.cache.get(channels.errors.id)
	// eslint-disable-next-line no-useless-return
	if (adminRoles.includes(dbCheck.clanRank) || !dbCheck.discActive || dbCheck.alt) { return } else {
		// Valence Server
		const getMember = server.members.cache.get(dbCheck.discord)
		if (!getMember) {
			errors.send({ content: `${dbCheck.clanMate} - ${dbCheck.discord} has left the Clan Discord.` })
			return await users.collection.updateOne({ clanMate: dbCheck.clanMate }, { $set: { discord: '', discActive: false } })
		}
		if (getMember.size) return errors.send({ content: `\`${dbCheck.clanMate}\` loaded a collection with discord id: \`${dbCheck.discord === '' ? 'Empty string' : dbCheck.discord}\` and active set to \`${dbCheck.discActive}\`.` })
		if (!getMember) return errors.send({ content: `${dbCheck.clanMate} return undefined.` })
		let role = getMember.roles.cache.filter(r => {
			const keys = Object.keys(clanRoles)
			return keys.find(val => r.name.toLowerCase() === val)
		})
		if (!role.size) return getMember.roles.add(guestRole)
		if (role.size > 1) return errors.send({ content: `${getMember} (${getMember.id}) has more than 1 rank role.` })
		role = role.first()
		if (role.name !== dbCheck.clanRank) {
			switch (dbCheck.clanRank) {
			case 'General':
				await setRoles(getMember, clanRoles.general, role)
				console.log('General:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Captain':
				await setRoles(getMember, clanRoles.captain, role)
				console.log('Captain:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Lieutenant':
				await setRoles(getMember, clanRoles.lieutenant, role)
				console.log('Lieutenant:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Sergeant':
				await setRoles(getMember, clanRoles.sergeant, role)
				console.log('Sergeant:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Corporal':
				await setRoles(getMember, clanRoles.corporal, role)
				console.log('Corporal:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			case 'Recruit':
				await setRoles(getMember, clanRoles.recruit, role)
				console.log('Recruit:', dbCheck.clanMate, role.name, dbCheck.clanRank)
				break
			}
		}
	}
}
