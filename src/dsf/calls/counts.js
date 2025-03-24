import { MERCH_REGEX, OTHER_CALLS_REGEX, FOREIGN_WORLD_REGEX } from './constants.js'
import { checkMemberRole, messageInArray, worldAlreadyCalled } from './merchFunctions.js'
import { buttonFunctions } from './callCount.js'
import { v4 as uuid } from 'uuid'

export const addCount = async (client, message, scoutersCollection, channelName) => {
	const channels = await client.database.channels
	const db = client.database.settings

	try {
		// Get fields from database
		const {
			merchChannel: { channelID, otherChannelID, messages, otherMessages },
			disallowedWords
		} = await db.findOne(
			{ _id: message.guild.id },
			{
				projection: {
					'merchChannel.channelID': 1,
					'merchChannel.messages': 1,
					'merchChannel.otherChannelID': 1,
					'merchChannel.otherMessages': 1,
					disallowedWords: 1
				}
			}
		)

		// Set channel specific variables
		let callChannel, callRegex, callDataBaseMessages
		if (channelName === 'merch') {
			callChannel = client.channels.cache.get(channelID)
			callRegex = MERCH_REGEX
			callDataBaseMessages = messages
		} else {
			// other
			callChannel = client.channels.cache.get(otherChannelID)
			callRegex = OTHER_CALLS_REGEX
			callDataBaseMessages = otherMessages
		}

		const dsfServerErrorChannel = await client.channels.cache.get('794608385106509824') // bot-logs-admin
		const botServerErrorChannel = await client.channels.cache.get('903432222139355207')

		// Get first channel message
		const firstChannelMessage = await message.channel.messages.fetch({ limit: 1 })
		if (!firstChannelMessage.size) {
			client.logger.info(`Could not fetch the first message of ${channelName}.`)
			await dsfServerErrorChannel.send({
				content: `Failed to fetch the first message in ${channelName}`
			})
			return false
		}
		const callMessage = firstChannelMessage.first()

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
				: worldAlreadyCalled(message, messages)
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
				firstTimestamp: callMessage.createdTimestamp,
				firstTimestampReadable: new Date(callMessage.createdTimestamp),
				lastTimestamp: callMessage.createdTimestamp,
				lastTimestampReadable: new Date(callMessage.createdTimestamp),
				count: 1,
				otherCount: 0,
				active: 1,
				assigned: []
			}

			if (channelName === 'other') {
				insertData.count = 0
				insertData.otherCount = 1
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

			const increaseCallCountData = {
				count: 1
			}

			if (channelName === 'other') {
				delete increaseCallCountData.count
				increaseCallCountData.otherCount = 1
			}

			client.logger.info(`Old: ${callerMember.displayName} (${message.content})`)
			if (callerProfile.oldScout && callerProfile.oldScout.firstPost) {
				// If a scouter was inactive and becomes active again, reset fields.
				await scoutersCollection.updateOne(
					{ userID: callerProfile.userID },
					{
						$inc: increaseCallCountData,
						$set: {
							'oldScout.firstPost': false,
							author: callerMember.nickname ?? callerMember.displayName,
							firstTimestamp: callMessage.createdTimestamp,
							firstTimestampReadable: new Date(callMessage.createdTimestamp),
							lastTimestamp: callMessage.createdTimestamp,
							lastTimestampReadable: new Date(callMessage.createdTimestamp),
							active: 1
						}
					}
				)
			} else {
				await scoutersCollection.updateOne(
					{ userID: callerProfile.userID },
					{
						$inc: increaseCallCountData,
						$set: {
							author: callerMember.nickname ?? callerMember.displayName,
							lastTimestamp: callMessage.createdTimestamp,
							lastTimestampReadable: new Date(callMessage.createdTimestamp),
							active: 1
						}
					}
				)
			}
		}

		// Add member to channel overrides to react to their call
		if (!(await checkMemberRole(callerMember.id, message))) {
			client.logger.info(`Adding ${callerMember.displayName} (${callerMember.id}) to ${channelName} channel overrides.`)
			await callChannel.permissionOverwrites.create(callerMember.id, { AddReactions: true })
		}

		// Add the called world to the messages database
		const addMessageData = {
			'merchChannel.messages': {
				eventID: uuid(),
				messageID: callMessage.id,
				content: callMessage.content,
				time: callMessage.createdTimestamp,
				author: callerMember.displayName,
				userID: callerMember.id
			}
		}

		if (channelName === 'other') {
			/* eslint no-useless-computed-key: 0 */
			delete Object.assign(addMessageData, { ['merchChannel.otherMessages']: addMessageData['merchChannel.messages'] })[
				'merchChannel.messages'
			]
		}

		await db.findOneAndUpdate({ _id: message.guild.id }, { $addToSet: addMessageData })

		return callCheckPassed
	} catch (err) {
		channels.errors.send(err)
	}
}
