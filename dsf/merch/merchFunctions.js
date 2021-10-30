const checkMemberRole = async (user, message) => {
	const mem = message.channel.guild.members.cache.get(user) ?? await message.channel.guild.members.fetch(user)
	const allowedRoles = ['Scouter', 'Verified Scouter', 'Staff', 'Moderator (Bronze Star)', 'Administrator (Silver Star)']
	const collectionTotal = mem.roles.cache.filter(r => allowedRoles.includes(r.name))
	if (collectionTotal.size) { return true } else { return false }
}

const arrIncludesString = (array, msg) => {
	return !array.some(value => msg.includes(value))
}
const alreadyCalled = (message, messages) => {
	const result = messages.filter(obj => {
		const str = obj.content
		const numFromDb = str.replace(/^\D+|\D.*$/g, '')
		const numFromContent = message.content.replace(/^\D+|\D.*$/g, '')
		if (numFromDb === numFromContent) {
			return obj
		}
	})
	// If already called, result.length > 0. Return false to delete the message.
	if (result.length) { return false } else { return true }
}

const updateButtonData = async (updateDB, message, userN, button) => {
	return await updateDB.updateOne({ _id: message.guild.id }, {
		$addToSet: {
			'merchChannel.components': {
				messageID: message.id,
				userID: userN.user.id,
				time: message.createdTimestamp,
				content: message.content,
				primaryID: `primary_${userN.user.id}`,
				dangerID: `danger_${userN.user.id}`,
				buttonMessageID: button.id
			}
		}
	})
}

const removeButtons = async (client, database, { errors }) => {
	try {
		let merchDB = await database.find({ merchChannel: { $exists: true } }).toArray();
		[merchDB] = merchDB.filter(db => db.serverName === 'Deep Sea Fishing')
		const oneDay = 8.64e+7
		const components = merchDB.merchChannel.components
		if (components.length) {
			try {
				const errorChannel = client.channels.cache.get(merchDB.merchChannel.deletions.adminChannelID)
				const removeMessageButtons = components.filter(obj => {
					if ((Date.now() - obj.time) > oneDay) {
						return obj
					}
				})
				return removeMessageButtons.forEach(async o => {
					const msg = await errorChannel.messages.fetch(o.buttonMessageID).catch(err => errors.send(err, module))
					await msg.edit({ components: [] })
					await database.updateOne({ serverName: 'Deep Sea Fishing' }, {
						$pull: {
							'merchChannel.components': { buttonMessageID: o.buttonMessageID }
						}
					})
				})
			} catch (err) {
				errors.send(err, module)
			}
		} else { return }
	} catch (err) {
		errors.send(err, module)
	}
}

export {
	checkMemberRole,
	arrIncludesString,
	alreadyCalled,
	updateButtonData,
	removeButtons
}
