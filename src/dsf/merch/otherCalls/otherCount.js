import { otherCalls, foreignWorldsRegex } from '../constants.js'
import { arrIncludesString, alreadyCalled } from '../merchFunctions.js'
import { buttonFunctions } from '../callCount.js'

export const addOtherCount = async (client, message, scouters) => {
	// Adds count for other events channel
	const channels = await client.database.channels
	const db = client.database.settings
	try {
		const {
			merchChannel: { otherChannelID, otherMessages },
			disallowedWords
		} = await db.findOne(
			{ _id: message.guild.id },
			{
				projection: {
					disallowedWords: 1,
					'merchChannel.otherMessages': 1,
					'merchChannel.otherChannelID': 1
				}
			}
		)
		const otherChannel = client.channels.cache.get(otherChannelID)
		const dsfServerErrorChannel = await client.channels.cache.get('794608385106509824')
		const botServerErrorChannel = await client.channels.cache.get('903432222139355207')

		// Adding count to members
		const mesOne = await message.channel.messages.fetch({ limit: 1 })
		const logOne = [...mesOne.values()]
		const msg = logOne.map((val) => val)

		const userN = message.member
		const findMessage = await scouters.findOne({ userID: msg[0].author.id })
		const timestamp = message.createdAt.toString().split(' ').slice(0, 5).join(' ')

		const [buttonSelection, buttonSelectionExtra, buttonSelectionForeignWorlds, buttonSelectionAlreadyCalled] =
			buttonFunctions(userN, message.content)

		if (!findMessage) {
			if (
				!otherCalls.test(message.content) ||
				arrIncludesString(disallowedWords, message.content) ||
				alreadyCalled(message, otherMessages)
			) {
				client.logger.info(`New & Spam: ${userN.displayName} (${message.content}) ${userN.id}`)
				return await dsfServerErrorChannel.send({
					content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has not posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${otherChannel.name}\`\`\``,
					components: foreignWorldsRegex.test(message.content)
						? [buttonSelectionForeignWorlds]
						: alreadyCalled(message, otherMessages)
						? [buttonSelectionAlreadyCalled]
						: [buttonSelection, buttonSelectionExtra]
				})
			}
			client.logger.info(`New other: ${msg[0].author.username} (${message.content}) ${msg[0].author.id}`)
			await scouters.insertOne({
				userID: msg[0].author.id,
				author: msg[0].member.nickname ?? msg[0].author.username,
				firstTimestamp: msg[0].createdTimestamp,
				firstTimestampReadable: new Date(msg[0].createdTimestamp),
				lastTimestamp: msg[0].createdTimestamp,
				lastTimestampReadable: new Date(msg[0].createdTimestamp),
				count: 0,
				game: 0,
				otherCount: 1,
				active: 1,
				assigned: []
			})
		} else {
			if (
				!otherCalls.test(message.content) ||
				arrIncludesString(disallowedWords, message.content) ||
				alreadyCalled(message, otherMessages)
			) {
				if (message.guild.id === '668330890790699079') {
					return await botServerErrorChannel.send({
						content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${otherChannel.name}\`\`\``,
						components: foreignWorldsRegex.test(message.content)
							? [buttonSelectionForeignWorlds]
							: alreadyCalled(message, otherMessages)
							? [buttonSelectionAlreadyCalled]
							: [buttonSelection, buttonSelectionExtra]
					})
				}
				client.logger.info(`Old & Spam: ${userN.displayName} (${message.content}) ${userN.id}`)
				return await dsfServerErrorChannel.send({
					content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.displayName}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${otherChannel.name}\`\`\``,
					components: foreignWorldsRegex.test(message.content)
						? [buttonSelectionForeignWorlds]
						: alreadyCalled(message, otherMessages)
						? [buttonSelectionAlreadyCalled]
						: [buttonSelection, buttonSelectionExtra]
				})
			}
			client.logger.info(`Old other: ${msg[0].author.username} (${message.content}) ${msg[0].author.id}`)
			if (findMessage.oldScout && findMessage.oldScout.firstPost) {
				// If a scouter was inactive and becomes active again, reset fields.
				await scouters.updateOne(
					{ userID: findMessage.userID },
					{
						$inc: { otherCount: 1 },
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
				await scouters.updateOne(
					{ userID: findMessage.userID },
					{
						$inc: {
							otherCount: 1
						},
						$set: {
							author: msg[0].member?.nickname ?? msg[0].author.username,
							lastTimestamp: msg[0].createdTimestamp,
							lastTimestampReadable: new Date(msg[0].createdTimestamp),
							active: 1
						}
					}
				)
			}
		}

		// Dupe call logging
		let mes = await message.channel.messages.fetch({ limit: 10 })
		mes = mes.filter((m) => {
			if (m.reactions.cache.has('☠️')) return undefined
			else return mes
		})
		const log = [...mes.values()]
		for (const msgs in log) {
			const authorName = log[msgs].member?.displayName
			const userId = log[msgs].author.id
			if (authorName === null) return
			await db.findOneAndUpdate(
				{ _id: message.guild.id },
				{
					$addToSet: {
						'merchChannel.otherMessages': {
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
	} catch (e) {
		channels.errors.send(e)
	}
}
