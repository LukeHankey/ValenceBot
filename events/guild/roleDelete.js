import { getDb } from '../../mongodb.js'

export default async (client, role) => {
	const db = getDb()
	const collection = db.collection('Settings')

	await collection.findOne({ _id: role.guild.id })
		.then(res => {
			if (res.adminRole === `<@&${role.id}>`) {
				collection.findOneAndUpdate({ adminRole: `<@&${role.id}>` }, { $set: { adminRole: res.defaultAdminRole } })
					.then(r => {
						client.users.cache.get(role.guild.ownerId).send({ content: `Your server Admin role was deleted in \`${role.guild.name}\` and has been set back to the default. Make sure to reset your Admin role to allow your server admins to use admin commands! Use \`${r.value.prefix}settings adminRole set <NEW ROLE>\` in ${role.guild.name} (Must have the Administrator permission)` })
						client.channels.cache.get('731997087721586698').send({ content: `The Admin role **(${role.name})** in \`${role.guild.name}\` has been deleted. The server owner has been sent a message!` })
					})
			}
		})
}
