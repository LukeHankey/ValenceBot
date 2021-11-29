import { MongoCollection } from '../../DataBase.js'
import { MessageEmbed, MessageActionRow, MessageButton } from 'discord.js'
import { redDark } from '../../colors.js'

export default async (client, message) => {
	const db = new MongoCollection('Settings')
	const fullDB = await db.collection.findOne({ _id: message.guild.id, merchChannel: { $exists: true } }, { projection: { merchChannel: { messages: 1, channelID: 1 } } })
	if (!fullDB) return
	const merchChannelID = message.guild.channels.cache.get(fullDB.merchChannel.channelID)

	const botServerChannel = await client.channels.cache.get('784543962174062608')
	const dsfServerChannel = await client.channels.cache.get('884076361940078682')

	const buttonSelection = new MessageActionRow()
		.addComponents(
			new MessageButton()
				.setCustomId('Remove Merch Count')
				.setLabel('Remove Merch Count')
				.setStyle('SUCCESS')
				.setEmoji('✅'))

	const sendAndUpdate = async (webhook, embed, data) => {
		const sentChannel = await webhook.send({ embeds: [embed], components: [buttonSelection] })
		const { userID } = data
		if (sentChannel.guild.id === message.guild.id) {
			await db.collection.updateOne({ _id: message.guild.id }, {
				$pull: { 'merchChannel.messages': { messageID: data.messageID } },
				$addToSet: { 'merchChannel.deletions.messages': { messageID: sentChannel.id, authorID: userID } }
			})
		}
	}

	// Cached messages only show the message object without null //
	// No DMs and only in merch channels
	if (!message.channel.guild || fullDB.merchChannel.channelID !== message.channel.id) return
	const fetchedLogs = await message.channel.guild.fetchAuditLogs({
		limit: 1,
		type: 'MESSAGE_DELETE'
	})

	const deletionLog = fetchedLogs.entries.first()

	if (!deletionLog) return console.log(`A message by ${message.author.tag} was deleted, but no relevant audit logs were found.`)
	const { executor, target } = deletionLog

	const messageDeletion = (document) => {
		const embed = new MessageEmbed()
			.setTitle('Message Deleted')
			.setColor(redDark)
			.addField('Message ID:', `${document.messageID}`, true)
			.addField('Message Content:', `${document.content}`, true)
			.addField('\u200B', '\u200B', true)
			.addField('Author ID:', `${document.userID}`, true)
			.addField('Author Tag:', `<@!${document.userID}>`, true)
			.addField('\u200B', '\u200B', true)
			.addField('Message Timestamp:', `${new Date(document.time).toString().split(' ').slice(0, -4).join(' ')}`, false)
		return embed
	}

	if (message.channel.guild === null || message.author === null) return console.log('Failed to fetch data for an uncached message.')

	// Self deletion
	if (target.id !== message.author.id) {
		// Bot self delete
		console.log('Message deleted:', message.content, message.author.id)
		if (message.author.id === '668330399033851924') return

		const checkDB = fullDB.merchChannel.messages.find(entry => entry.messageID === message.id)
		if (checkDB === undefined) { return console.log('Deleted message was not uploaded to the DataBase.') } else {
			const user = await message.channel.guild.members
				.fetch(checkDB.userID)
				.catch(err => console.error('message delete', err))

			const embed = messageDeletion(checkDB)
				.setDescription('This message was deleted by the message author - remove merch count.')
				.setThumbnail(user.user.displayAvatarURL())
				.setFooter('Click the ✅ or use the command to remove merch count.')

			await sendAndUpdate(botServerChannel, embed, checkDB)
			await sendAndUpdate(dsfServerChannel, embed, checkDB)

			const getPerms = await merchChannelID.permissionOverwrites.cache.get(checkDB.userID)
			if (getPerms) {
				console.log(`Removing ${user.user.username} (${checkDB.userID}) from channel overrides.`)
				return getPerms.delete()
			}
		}
	} else { // Someone else deleted message
		// Bot deleting own posts
		if (target.id === '668330399033851924') return

		const checkDB = fullDB.merchChannel.messages.find(entry => entry.messageID === message.id)
		if (checkDB === undefined) { return console.log('Deleted message was not uploaded to the DataBase.') } else {
			const user = await message.channel.guild.members
				.fetch(checkDB.userID)
				.catch(err => console.error('message delete own', err))

			const embed = messageDeletion(checkDB)
				.setDescription(`This message was deleted by ${executor.username} - remove merch count.`)
				.setThumbnail(user.user.displayAvatarURL())

			// Remove count by posting or bot to remove
			await sendAndUpdate(botServerChannel, embed, checkDB)
			await sendAndUpdate(dsfServerChannel, embed, checkDB)

			const getPerms = await merchChannelID.permissionOverwrites.cache.get(checkDB.userID)
			if (getPerms) {
				console.log(`Removing ${user.user.username} (${checkDB.userID}) from channel overrides.`)
				return getPerms.delete()
			}
		}
	}
}
