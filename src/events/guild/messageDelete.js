import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent } from 'discord.js'
import Color from '../../colors.js'
import { overrideEventTimer } from '../../dsf/calls/eventTimers.js'

export default async (client, message) => {
	const db = client.database.settings
	const ticketData = await db.findOne({ _id: message.guild.id }, { projection: { ticket: 1 } })

	if (!ticketData || !ticketData.ticket) return
	const [currentTicket] = ticketData.ticket.filter((t) => t.messageId === message.id)
	if (currentTicket) {
		if (message.id === currentTicket.messageId) {
			return await db.findOneAndUpdate(
				{ _id: message.guild.id },
				{
					$pull: {
						ticket: { messageId: message.id }
					}
				}
			)
		}
	}

	const fullDB = await db.findOne(
		{ _id: message.guild.id, merchChannel: { $exists: true } },
		{ projection: { merchChannel: { messages: 1, channelID: 1, otherChannelID: 1, otherMessages: 1 } } }
	)
	if (!fullDB) return
	const merchChannelID = message.guild.channels.cache.get(fullDB.merchChannel.channelID)
	const otherChannelID = message.guild.channels.cache.get(fullDB.merchChannel.otherChannelID)

	const botServerChannel = await client.channels.cache.get('784543962174062608')
	const dsfServerChannel = await client.channels.cache.get('884076361940078682')

	const buttonSelectionMerch = new ActionRowBuilder().addComponents([
		new ButtonBuilder()
			.setCustomId('Remove Merch Count')
			.setLabel('Remove Merch Count')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '✅' })
	])

	const buttonSelectionOther = new ActionRowBuilder().addComponents([
		new ButtonBuilder()
			.setCustomId('Remove Other Count')
			.setLabel('Remove Other Count')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '✅' })
	])

	const sendAndUpdate = async (webhook, embed, data, button) => {
		const sentChannel = await webhook.send({ embeds: [embed], components: [button] })
		const { userID } = data
		if (sentChannel.guild.id === message.guild.id) {
			await db.updateOne(
				{ _id: message.guild.id },
				{
					$pull: {
						'merchChannel.messages': { messageID: data.messageID },
						'merchChannel.otherMessages': { messageID: data.messageID }
					},
					$addToSet: {
						'merchChannel.deletions.messages': { messageID: sentChannel.id, authorID: userID, eventID: data.eventID }
					}
				}
			)
		}
	}

	// Cached messages only show the message object without null //
	// No DMs and only in merch channels
	if (!message.guild || ![merchChannelID.id, otherChannelID.id].includes(message.channel.id)) return
	const fetchedLogs = await message.guild.fetchAuditLogs({
		limit: 1,
		type: AuditLogEvent.MessageDelete
	})

	const deletionLog = fetchedLogs.entries.first()
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

	const handleDeletions = async (channel = 'merch', deletedBy = null) => {
		let checkDB = fullDB.merchChannel.messages.find((entry) => entry.messageID === message.id)
		let button = buttonSelectionMerch
		if (channel === 'other') {
			checkDB = fullDB.merchChannel.otherMessages.find((entry) => entry.messageID === message.id)
			button = buttonSelectionOther
		}

		if (checkDB === undefined) {
			return client.logger.info('Deleted message was not uploaded to the DataBase.')
		}

		const user = await message.guild.members.fetch(checkDB.userID).catch((err) => {
			client.logger.error(`5: ${err} \n${deletedBy ? 'message delete' : 'message delete own'}`)
			// Dirty hack to get the user object
			message.user = message.author
			return message
		})

		const embed = messageDeletion(checkDB)
			// eslint-disable-next-line no-unneeded-ternary
			.setDescription(`This message was deleted by ${deletedBy ? deletedBy : 'the message author'} - remove merch count.`)
			.setThumbnail(user.user.displayAvatarURL())
			.setFooter({ text: 'Click the button or use the command to remove merch count.' })

		await sendAndUpdate(botServerChannel, embed, checkDB, button)
		await sendAndUpdate(dsfServerChannel, embed, checkDB, button)

		if (channel === 'merch') {
			const getPerms = await merchChannelID.permissionOverwrites.cache.get(checkDB.userID)
			if (getPerms) {
				client.logger.info(`Removing ${user.user.username} (${checkDB.userID}) from channel overrides.`)
				return getPerms.delete()
			}
		}

		await overrideEventTimer(checkDB.eventID, 0)
	}

	if (message.guild === null || message.author === null) {
		return client.logger.info('Failed to fetch data for an uncached message.')
	}

	// No Audit logs
	if (!deletionLog) return

	// Self deletion
	if (!('target' in deletionLog) || deletionLog.target.id !== message.author.id) {
		// Bot self delete
		if (message.author.id === '668330399033851924') return

		if (message.channel.id === merchChannelID.id) {
			return await handleDeletions('merch', null)
		}
		await handleDeletions('other', null)
	} else {
		const { executor, target } = deletionLog
		// Someone else deleted message
		// Bot deleting own posts
		if (target.id === '668330399033851924') return

		if (message.channel.id === merchChannelID.id) {
			return await handleDeletions('merch', executor.username)
		}
		await handleDeletions('other', executor.username)
	}
}
