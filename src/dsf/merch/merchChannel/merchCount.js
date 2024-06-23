import { merchRegex, foreignWorldsRegex } from '../constants.js'
import { checkMemberRole, messageInArray, alreadyCalled } from '../merchFunctions.js'
import { buttonFunctions } from '../callCount.js'

export const addMerchCount = async (client, message, scouter) => {
	const channels = await client.database.channels
	const db = client.database.settings
	try {
		const {
			merchChannel: { channelID, messages },
			disallowedWords
		} = await db.findOne(
			{ _id: message.guild.id },
			{ projection: { 'merchChannel.channelID': 1, 'merchChannel.messages': 1, disallowedWords: 1 } }
		)
		const merchChannelID = client.channels.cache.get(channelID)
		const dsfServerErrorChannel = await client.channels.cache.get('794608385106509824')
		const botServerErrorChannel = await client.channels.cache.get('903432222139355207')

		// Adding count to members
		const mesOne = await message.channel.messages.fetch({ limit: 1 })
		const logOne = [...mesOne.values()]
		const msg = logOne.map((val) => val)

		const userN = message.member
		const findMessage = await scouter.findOne({ userID: userN.id })
		const timestamp = message.createdAt.toString().split(' ').slice(0, 5).join(' ')

		const [buttonSelection, buttonSelectionExtra, buttonSelectionForeignWorlds, buttonSelectionAlreadyCalled] =
			buttonFunctions(userN, message.content)

		if (!findMessage) {
			if (
				!merchRegex.test(message.content) ||
				messageInArray(message.content, disallowedWords) ||
				alreadyCalled(message, messages)
			) {
				if (message.guild.id === '668330890790699079') {
					return await botServerErrorChannel.send({
						content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has not posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${merchChannelID.name}\`\`\``,
						components: foreignWorldsRegex.test(message.content)
							? [buttonSelectionForeignWorlds]
							: alreadyCalled(message, messages)
							? [buttonSelectionAlreadyCalled]
							: [buttonSelection, buttonSelectionExtra]
					})
				}
				client.logger.info(`New & Spam: ${userN.displayName} (${message.content}) userId: ${userN.id}`)
				return await dsfServerErrorChannel.send({
					content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has not posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${merchChannelID.name}\`\`\``,
					components: foreignWorldsRegex.test(message.content)
						? [buttonSelectionForeignWorlds]
						: alreadyCalled(message, messages)
						? [buttonSelectionAlreadyCalled]
						: [buttonSelection, buttonSelectionExtra]
				})
			}
			client.logger.info(`New: ${userN.displayName} (${message.content}) userId: ${userN.id}`)
			await scouter.insertOne({
				userID: userN.id,
				author: userN.nickname ?? userN.displayName,
				firstTimestamp: msg[0].createdTimestamp,
				firstTimestampReadable: new Date(msg[0].createdTimestamp),
				lastTimestamp: msg[0].createdTimestamp,
				lastTimestampReadable: new Date(msg[0].createdTimestamp),
				count: 1,
				otherCount: 0,
				active: 1,
				assigned: []
			})
			if (!(await checkMemberRole(userN.id, message))) {
				client.logger.info(`Adding ${userN.nickname ?? userN.displayName} (${userN.id}) to channel overrides.`)
				await merchChannelID.permissionOverwrites.create(userN.id, { AddReactions: true })
			}
		} else {
			if (
				!merchRegex.test(message.content) ||
				messageInArray(message.content, disallowedWords) ||
				alreadyCalled(message, messages)
			) {
				if (message.guild.id === '668330890790699079') {
					return await botServerErrorChannel.send({
						content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${merchChannelID.name}\`\`\``,
						components: foreignWorldsRegex.test(message.content)
							? [buttonSelectionForeignWorlds]
							: alreadyCalled(message, messages)
							? [buttonSelectionAlreadyCalled]
							: [buttonSelection, buttonSelectionExtra]
					})
				}
				client.logger.info(`Old & Spam: ${userN.displayName} (${message.content}) userId: ${userN.id}`)
				return await dsfServerErrorChannel.send({
					content: ` \`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.user.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${merchChannelID.name}\`\`\``,
					components: foreignWorldsRegex.test(message.content)
						? [buttonSelectionForeignWorlds]
						: alreadyCalled(message, messages)
						? [buttonSelectionAlreadyCalled]
						: [buttonSelection, buttonSelectionExtra]
				})
			}
			client.logger.info(`Old: ${userN.displayName} (${message.content})`)
			if (findMessage.oldScout && findMessage.oldScout.firstPost) {
				// If a scouter was inactive and becomes active again, reset fields.
				await scouter.updateOne(
					{ userID: findMessage.userID },
					{
						$inc: { count: 1 },
						$set: {
							'oldScout.firstPost': false,
							author: userN.nickname ?? userN.displayName,
							firstTimestamp: msg[0].createdTimestamp,
							firstTimestampReadable: new Date(msg[0].createdTimestamp),
							lastTimestamp: msg[0].createdTimestamp,
							lastTimestampReadable: new Date(msg[0].createdTimestamp),
							active: 1
						}
					}
				)
			} else {
				await scouter.updateOne(
					{ userID: findMessage.userID },
					{
						$inc: {
							count: 1
						},
						$set: {
							author: userN.nickname ?? userN.displayName,
							lastTimestamp: msg[0].createdTimestamp,
							lastTimestampReadable: new Date(msg[0].createdTimestamp),
							active: 1
						}
					}
				)
			}
			if (!(await checkMemberRole(userN.id, message))) {
				client.logger.info(`Adding ${userN.displayName} (${userN.id}) to channel overrides.`)
				await merchChannelID.permissionOverwrites.create(userN.id, { AddReactions: true })
			}
		}

		// Database logging for merch worlds
		let mes = await message.channel.messages.fetch({ limit: 10 })
		mes = mes.filter((m) => !m.reactions.cache.has('☠️'))
		const log = [...mes.values()]
		for (const msgs in log) {
			const authorName = log[msgs].member?.displayName
			const userId = log[msgs].member?.id ?? log[msgs].author.id
			if (!authorName || userId === '668330399033851924') return
			await db.findOneAndUpdate(
				{ _id: message.guild.id },
				{
					$addToSet: {
						'merchChannel.messages': {
							$each: [
								{
									messageID: log[msgs].id,
									content: log[msgs].content,
									time: log[msgs].createdTimestamp,
									author: authorName,
									userID: userId
								}
							]
						}
					}
				}
			)
		}
	} catch (err) {
		channels.errors.send(err)
	}
}
