import { MongoCollection } from '../../DataBase.js'
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent } from 'discord.js'
import Color from '../../colors.js'

export default async (client, message) => {
	const db = new MongoCollection('Settings')
	const ticketData = await db.collection.findOne({ _id: message.guild.id }, { projection: { ticket: 1 } })

	if (!ticketData || !ticketData.ticket) return
	const [currentTicket] = ticketData.ticket.filter((t) => t.messageId === message.id)
	if (currentTicket) {
		if (message.id === currentTicket.messageId) {
			return await db.collection.findOneAndUpdate(
				{ _id: message.guild.id },
				{
					$pull: {
						ticket: { messageId: message.id }
					}
				}
			)
		}
	}

	const fullDB = await db.collection.findOne(
		{ _id: message.guild.id, merchChannel: { $exists: true } },
		{ projection: { merchChannel: { messages: 1, channelID: 1 } } }
	)
	if (!fullDB) return
	const merchChannelID = message.guild.channels.cache.get(fullDB.merchChannel.channelID)

	const botServerChannel = await client.channels.cache.get('784543962174062608')
	const dsfServerChannel = await client.channels.cache.get('884076361940078682')

	const buttonSelection = new ActionRowBuilder().addComponents([
		new ButtonBuilder()
			.setCustomId('Remove Merch Count')
			.setLabel('Remove Merch Count')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '✅' })
	])

	const sendAndUpdate = async (webhook, embed, data) => {
		const sentChannel = await webhook.send({ embeds: [embed], components: [buttonSelection] })
		const { userID } = data
		if (sentChannel.guild.id === message.guild.id) {
			await db.collection.updateOne(
				{ _id: message.guild.id },
				{
					$pull: { 'merchChannel.messages': { messageID: data.messageID } },
					$addToSet: {
						'merchChannel.deletions.messages': { messageID: sentChannel.id, authorID: userID }
					}
				}
			)
		}
	}

	// Cached messages only show the message object without null //
	// No DMs and only in merch channels
	if (!message.guild || fullDB.merchChannel.channelID !== message.channel.id) return
	const fetchedLogs = await message.guild.fetchAuditLogs({
		limit: 1,
		type: AuditLogEvent.MessageDelete
	})

	const deletionLog = fetchedLogs.entries.first()

	if (!deletionLog) {
		return client.logger.info(`A message by ${message.author.tag} was deleted, but no relevant audit logs were found.`)
	}
	const { executor, target } = deletionLog

	const messageDeletion = (document) => {
		const embed = new EmbedBuilder()
			.setTitle('Message Deleted')
			.setColor(Color.redDark)
			.addFields(
				{ name: 'Message ID:', value: `${document.messageID}`, inline: true },
				{ name: 'Message Content:', value: `${document.content}`, inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{ name: 'Author ID:', value: `${document.userID}`, inline: true },
				{ name: 'Author Tag:', value: `<@!${document.userID}>`, inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{
					name: 'Message Timestamp:',
					value: `${new Date(document.time).toString().split(' ').slice(0, -4).join(' ')}`,
					inline: false
				}
			)
		return embed
	}

	if (message.guild === null || message.author === null) {
		return client.logger.info('Failed to fetch data for an uncached message.')
	}

	// Self deletion
	if (target.id !== message.author.id) {
		// Bot self delete
		if (message.author.id === '668330399033851924') return

		const checkDB = fullDB.merchChannel.messages.find((entry) => entry.messageID === message.id)
		if (checkDB === undefined) {
			return client.logger.info('Deleted message was not uploaded to the DataBase.')
		} else {
			const user = await message.guild.members
				.fetch(checkDB.userID)
				.catch((err) => client.logger.error(`${err} \nmessage delete`))

			const embed = messageDeletion(checkDB)
				.setDescription('This message was deleted by the message author - remove merch count.')
				.setThumbnail(user.user.displayAvatarURL())
				.setFooter({ text: 'Click the button or use the command to remove merch count.' })

			await sendAndUpdate(botServerChannel, embed, checkDB)
			await sendAndUpdate(dsfServerChannel, embed, checkDB)

			const getPerms = await merchChannelID.permissionOverwrites.cache.get(checkDB.userID)
			if (getPerms) {
				client.logger.info(`Removing ${user.user.username} (${checkDB.userID}) from channel overrides.`)
				return getPerms.delete()
			}
		}
	} else {
		// Someone else deleted message
		// Bot deleting own posts
		if (target.id === '668330399033851924') return

		const checkDB = fullDB.merchChannel.messages.find((entry) => entry.messageID === message.id)
		if (checkDB === undefined) {
			return client.logger.info('Deleted message was not uploaded to the DataBase.')
		} else {
			const user = await message.guild.members
				.fetch(checkDB.userID)
				.catch((err) => client.logger.error(`${err} \n'message delete own`))

			const embed = messageDeletion(checkDB)
				.setDescription(`This message was deleted by ${executor.username} - remove merch count.`)
				.setThumbnail(user.user.displayAvatarURL())

			// Remove count by posting or bot to remove
			await sendAndUpdate(botServerChannel, embed, checkDB)
			await sendAndUpdate(dsfServerChannel, embed, checkDB)

			const getPerms = await merchChannelID.permissionOverwrites.cache.get(checkDB.userID)
			if (getPerms) {
				client.logger.info(`Removing ${user.user.username} (${checkDB.userID}) from channel overrides.`)
				return getPerms.delete()
			}
		}
	}
}
