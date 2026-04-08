import { OTHER_CALLS_REGEX, FOREIGN_WORLD_REGEX } from './constants.js'
import { checkMemberRole, messageInArray, worldAlreadyCalled } from './merchFunctions.js'
import { buttonFunctions } from './callCount.js'

export const addCount = async (client, message, alt1Count = false) => {
	const channels = await client.database.channels
	const db = client.database.settings
	const scoutersCollection = client.database.scoutTracker

	try {
		// Get fields from database
		const {
			merchChannel: { otherChannelID, otherMessages },
			disallowedWords
		} = await db.findOne(
			{ _id: message.guild.id },
			{
				projection: {
					'merchChannel.otherChannelID': 1,
					'merchChannel.otherMessages': 1,
					disallowedWords: 1
				}
			}
		)

		const callChannel = client.channels.cache.get(otherChannelID)
		const callRegex = OTHER_CALLS_REGEX
		const callDataBaseMessages = otherMessages

		const dsfServerErrorChannel = await client.channels.cache.get('794608385106509824') // bot-logs-admin
		const botServerErrorChannel = await client.channels.cache.get('903432222139355207')

		const callerMember = message.member
		const callerProfile = await scoutersCollection.findOne({ userID: callerMember.id })
		const timestamp = message.createdAt.toString().split(' ').slice(0, 5).join(' ')

		const [buttonSelection, buttonSelectionExtra, buttonSelectionForeignWorlds, buttonSelectionAlreadyCalled] =
			buttonFunctions(callerMember, message.content)

		const callCheckPass = (message, includedWords, dataBaseMessages, regexCheck) => {
			return (
				regexCheck.test(message.content) &&
				!messageInArray(message.content, includedWords) &&
				!worldAlreadyCalled(message, dataBaseMessages)
			)
		}

		const callCheckPassed = callCheckPass(message, disallowedWords, callDataBaseMessages, callRegex)

		const spamOptions = {
			content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has ${
				callerProfile ? '' : 'not '
			}posted before)\n\n- User ID: <@!${callerMember.id}>\n- User: ${callerMember.user.username}\n- Content: ${
				message.content
			}\n- Timestamp: ${timestamp}\n- Channel: ${callChannel.name}\`\`\``,
			components: FOREIGN_WORLD_REGEX.test(message.content)
				? [buttonSelectionForeignWorlds]
				: worldAlreadyCalled(message, callDataBaseMessages) || alt1Count
				? [buttonSelectionAlreadyCalled]
				: [buttonSelection, buttonSelectionExtra]
		}

		if (!callerProfile) {
			if (!callCheckPassed) {
				if (message.guild.id === '668330890790699079') {
					await botServerErrorChannel.send(spamOptions)
					return false
				}
				client.logger.info(`New & Spam: ${callerMember.displayName} (${message.content}) userId: ${callerMember.id}`)
				await dsfServerErrorChannel.send(spamOptions)
				return false
			}

			client.logger.info(`New: ${callerMember.displayName} (${message.content}) userId: ${callerMember.id}`)
			const insertData = {
				userID: callerMember.id,
				author: callerMember.nickname ?? callerMember.displayName,
				firstTimestamp: message.createdTimestamp,
				firstTimestampReadable: new Date(message.createdTimestamp),
				lastTimestamp: message.createdTimestamp,
				lastTimestampReadable: new Date(message.createdTimestamp),
				count: 0,
				otherCount: 1,
				active: 1,
				assigned: []
			}

			await scoutersCollection.insertOne(insertData)
		} else {
			if (!callCheckPassed) {
				if (message.guild.id === '668330890790699079') {
					await botServerErrorChannel.send(spamOptions)
					return false
				}
				client.logger.info(`Old & Spam: ${callerMember.displayName} (${message.content}) userId: ${callerMember.id}`)
				await dsfServerErrorChannel.send(spamOptions)
				return false
			}

			if (callerProfile.oldScout && callerProfile.oldScout.firstPost) {
				// If a scouter was inactive and becomes active again, reset fields.
				await scoutersCollection.updateOne(
					{ userID: callerProfile.userID },
					{
						$inc: {
							otherCount: 1
						},
						$set: {
							'oldScout.firstPost': false,
							author: callerMember.nickname ?? callerMember.displayName,
							firstTimestamp: message.createdTimestamp,
							firstTimestampReadable: new Date(message.createdTimestamp),
							lastTimestamp: message.createdTimestamp,
							lastTimestampReadable: new Date(message.createdTimestamp),
							active: 1
						}
					}
				)
			} else if (!alt1Count) {
				client.logger.info(`Old: ${callerMember.displayName} (${message.content})`)
				await scoutersCollection.updateOne(
					{ userID: callerProfile.userID },
					{
						$inc: {
							otherCount: 1
						},
						$set: {
							author: callerMember.nickname ?? callerMember.displayName,
							lastTimestamp: message.createdTimestamp,
							lastTimestampReadable: new Date(message.createdTimestamp),
							active: 1
						}
					}
				)
			}
		}

		// Add member to channel overrides to react to their call
		if (!(await checkMemberRole(callerMember.id, message))) {
			if (callChannel) {
				client.logger.info(`Adding ${callerMember.displayName} (${callerMember.id}) to other channel overrides.`)
				await callChannel.permissionOverwrites.create(callerMember.id, { AddReactions: true })
			}
		}

		return callCheckPassed
	} catch (err) {
		channels.errors.send(err)
	}
}

export const addMessageToDB = async (message, db, eventID) => {
	const addMessageData = {
		'merchChannel.otherMessages': {
			eventID: eventID,
			messageID: message.id,
			content: message.content,
			time: message.createdTimestamp,
			author: message.member?.displayName ?? message.author.username,
			userID: message.member?.id ?? message.author.id
		}
	}

	await db.findOneAndUpdate({ _id: message.guild.id }, { $addToSet: addMessageData })
}
