export const updateAllMemberDataBaseRankRoles = async (client, scoutRole) => {
	const scouterMemberIds = scoutRole.scouts.map((profile) => profile.userID)
	const guild = await scoutRole.guild
	const fetchedMembers = await guild.members.fetch({ user: scouterMemberIds })

	for (const member of fetchedMembers.values()) {
		await addMemberDataBaseRankRoles(client, member, scoutRole)
		await removeMemberDataBaseRankRoles(client, member, scoutRole)
	}
}

const addMemberDataBaseRankRoles = async (client, member, scoutRole) => {
	const scoutTracker = client.database.scoutTracker
	const guild = await scoutRole.guild
	const role = await scoutRole.role
	const verifiedRole = guild.roles.cache.find((r) => r.name.toLowerCase() === 'verified scouter')
	const botRole = guild.members.me.roles.cache.find((r) => r.managed)

	const memberAssignedRoles = member.roles.cache
		.filter((r) => r.id !== guild.id && r.position > botRole.position)
		.sort((a, b) => b.position - a.position)
		.map((r) => r.id)

	await scoutTracker.updateOne(
		{ userID: member.id },
		{
			$addToSet: {
				rankRoles: {
					$each: [role.id, verifiedRole.id, ...memberAssignedRoles]
				}
			}
		}
	)
}

export const removeMemberDataBaseRankRoles = async (client, member, scoutRole) => {
	const scoutTracker = client.database.scoutTracker
	const guild = await scoutRole.guild
	const botRole = guild.members.me.roles.cache.find((r) => r.managed)

	const currentRoles = member.roles.cache.filter((r) => r.id !== guild.id && r.position > botRole.position).map((r) => r.id)

	// Fetch stored roles from the database
	const userEntry = await scoutTracker.findOne({ userID: member.id })
	if (!userEntry || !userEntry.rankRoles) return // No stored roles, nothing to remove

	const storedRoles = userEntry.rankRoles

	// Find roles that exist in the database but not in Discord (removed roles)
	const removedRoles = storedRoles.filter((roleId) => !currentRoles.includes(roleId))
	if (removedRoles.length > 0) {
		// Remove the roles from the database
		await scoutTracker.updateOne({ userID: member.id }, { $pull: { rankRoles: { $in: removedRoles } } })
	}
}
