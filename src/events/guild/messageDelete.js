import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent } from 'discord.js'
import Color from '../../colors.js'
import { overrideEventTimer } from '../../dsf/calls/eventTimers.js'

export default async (client, message) => {
	const db = client.database.settings
	client.logger.debug(`messageDelete start: guild=${message.guild?.id} channel=${message.channel?.id} message=${message.id}`)
	const ticketData = await db.findOne({ _id: message.guild.id }, { projection: { ticket: 1 } })

	if (!ticketData || !ticketData.ticket) {
		client.logger.debug(`messageDelete early return: missing ticket config for guild=${message.guild.id}`)
		return
	}
	const [currentTicket] = ticketData.ticket.filter((t) => t.messageId === message.id)
	if (currentTicket) {
		if (message.id === currentTicket.messageId) {
			client.logger.debug(`messageDelete matched ticket message: ${message.id}`)
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
		{ projection: { merchChannel: { otherMessages: 1, otherChannelID: 1 } } }
	)
	if (!fullDB) {
		client.logger.debug(`messageDelete early return: no merchChannel data for guild=${message.guild.id}`)
		return
	}
	const otherChannelID = message.guild.channels.cache.get(fullDB.merchChannel.otherChannelID)
	client.logger.debug(
		`messageDelete channel check: deletedChannel=${message.channel?.id} configuredOther=${fullDB.merchChannel.otherChannelID} resolvedOther=${otherChannelID?.id}`
	)

	const botServerChannel = client.channels.cache.get('784543962174062608') ?? message.channel
	const dsfServerChannel = client.channels.cache.get('884076361940078682') ?? botServerChannel

	const buttonSelectionOther = new ActionRowBuilder().addComponents([
		new ButtonBuilder()
			.setCustomId('Remove Other Count')
			.setLabel('Remove Other Count')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '✅' })
	])

	const sendAndUpdate = async (webhook, embed, data, button) => {
		client.logger.debug(
			`messageDelete sendAndUpdate: targetChannel=${webhook?.id} eventID=${data.eventID} messageID=${data.messageID}`
		)
		if (!webhook) return
		const components = button ? [button] : []
		const sentChannel = await webhook.send({ embeds: [embed], components })
		const { userID } = data
		if (sentChannel.guild.id === message.guild.id) {
			await db.updateOne(
				{ _id: message.guild.id },
				{
					$pull: {
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
	// No DMs and only in dsf-calls
	if (!message.guild || message.channel.id !== otherChannelID.id) {
		client.logger.debug('messageDelete early return: not a tracked dsf-calls message')
		return
	}
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

	const handleDeletions = async (deletedBy = null) => {
		const checkDB = fullDB.merchChannel.otherMessages.find((entry) => entry.messageID === message.id)
		const button = buttonSelectionOther
		client.logger.debug(`messageDelete DB lookup: found=${Boolean(checkDB)} deletedBy=${deletedBy ?? 'author'}`)

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
			.setDescription(`This message was deleted by ${deletedBy ? deletedBy : 'the message author'} - remove other count.`)
			.setThumbnail(user.user.displayAvatarURL())
			.setFooter({ text: 'Click the button or use the command to remove other count.' })

		await sendAndUpdate(botServerChannel, embed, checkDB, button)
		if (dsfServerChannel.id !== botServerChannel.id) {
			await sendAndUpdate(dsfServerChannel, embed, checkDB, button)
		}

		await overrideEventTimer(checkDB.eventID, 0)
	}

	if (message.guild === null || message.author === null) {
		return client.logger.info('Failed to fetch data for an uncached message.')
	}

	// No Audit logs
	if (!deletionLog) {
		client.logger.debug('messageDelete no audit log entry found; proceeding without deleter info')
		if (message.author.id === '668330399033851924') return
		await handleDeletions(null)
		return
	}

	// Self deletion
	if (!('target' in deletionLog) || deletionLog.target.id !== message.author.id) {
		// Bot self delete
		if (message.author.id === '668330399033851924') return
		await handleDeletions(null)
	} else {
		const { executor, target } = deletionLog
		// Someone else deleted message
		// Bot deleting own posts
		if (target.id === '668330399033851924') return
		await handleDeletions(executor.username)
	}
}
