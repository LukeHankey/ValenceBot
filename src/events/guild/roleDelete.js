const BOT_LOG_CHANNEL = '731997087721586698'

/**
 * When the configured Admin or Mod Role is deleted, put it back to the
 * server's default and tell the owner.
 *
 * This used to compare a top-level `adminRole`, but the role is stored at
 * `roles.adminRole`, so it never matched and never reset anything.
 */
export default async (client, role) => {
	const db = client.database.settings
	const settings = await db.findOne({ _id: role.guild.id }, { projection: { roles: 1 } })
	const roles = settings?.roles
	if (!roles) return

	const deleted = `<@&${role.id}>`
	const affected = [
		['adminRole', 'Admin Role', 'admin-role'],
		['modRole', 'Mod Role', 'mod-role']
	].filter(([field]) => roles[field] === deleted)
	if (!affected.length) return

	await db.updateOne(
		{ _id: role.guild.id },
		{ $set: Object.fromEntries(affected.map(([field]) => [`roles.${field}`, roles.defaultAdminRole])) }
	)

	const labels = affected.map(([, label]) => label).join(' and ')
	const commands = affected.map(([, , sub]) => `\`/settings ${sub}\``).join(' and ')
	const owner = await role.guild.fetchOwner().catch(() => null)
	await owner
		?.send({
			content: `The ${labels} for **${role.guild.name}** (${role.name}) was deleted, so it has been reset to the default. Use ${commands} in ${role.guild.name} to choose a new one.`
		})
		.catch(() => null) // The owner may not accept DMs from the bot.

	await client.channels.cache.get(BOT_LOG_CHANNEL)?.send({
		content: `The ${labels} **(${role.name})** in \`${role.guild.name}\` was deleted and has been reset to the default.`
	})
}
