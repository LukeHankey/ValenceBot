import { merchRegex } from '../constants.js'
import { checkMemberRole, arrIncludesString, alreadyCalled, updateButtonData } from '../merchFunctions.js'
import { MessageActionRow, MessageButton } from 'discord.js'

const addMerchCount = async (client, message, db) => {
	const channels = await db.channels
	try {
		const { merchChannel: { scoutTracker, channelID, messages }, disallowedWords } = await db.collection.findOne({ _id: message.channel.guild.id }, { projection: { 'merchChannel.scoutTracker': 1, 'merchChannel.channelID': 1, 'merchChannel.messages': 1, disallowedWords: 1 } })
		const merchChannelID = client.channels.cache.get(channelID)
		const botServerErrorChannel = await client.channels.cache.get('784543962174062608')
		const dsfServerErrorChannel = await client.channels.cache.get('794608385106509824')

		// Adding count to members
		const mesOne = await message.channel.messages.fetch({ limit: 1 })
		const logOne = [...mesOne.values()]
		const msg = logOne.map(val => val)

		const userN = message.member
		const findMessage = scoutTracker.find(x => x.userID === userN.id)
		const timestamp = message.createdAt.toString().split(' ').slice(0, 5).join(' ')
		const buttonSelection = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(`primary_${userN.user.id}`)
					.setLabel(`DM ${userN.user.username}`)
					.setStyle('PRIMARY')
					.setEmoji('✉️'),
				new MessageButton()
					.setCustomId(`danger_${userN.user.id}`)
					.setLabel('Clear Buttons')
					.setStyle('DANGER')
					.setEmoji('❌')
			)

		if (!findMessage) {
			if (!merchRegex.test(message.content) || !arrIncludesString(disallowedWords, message.content) || !alreadyCalled(message, messages)) {
				console.log(`New & Spam: ${userN.user.username} (${message.content})`, userN.id)
				if (message.guild.id === '668330890790699079') {
					const buttonMessageError = await botServerErrorChannel.send({ content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has not posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\`\`\``, components: [buttonSelection] })
					return await updateButtonData(db, message, userN, buttonMessageError)
				}
				await botServerErrorChannel.send({ content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has not posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\`\`\`` })
				const buttonMessageError = await dsfServerErrorChannel.send({ content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has not posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\`\`\``, components: [buttonSelection] })
				return await updateButtonData(db, message, userN, buttonMessageError)
			}
			console.log(`New: ${userN.user.username} (${message.content})`, userN.id)
			await db.collection.findOneAndUpdate({ _id: message.channel.guild.id },
				{
					$addToSet: {
						'merchChannel.scoutTracker': {
							$each: [{
								userID: userN.id,
								author: userN.nickname ?? userN.user.username,
								firstTimestamp: msg[0].createdTimestamp,
								firstTimestampReadable: new Date(msg[0].createdTimestamp),
								lastTimestamp: msg[0].createdTimestamp,
								lastTimestampReadable: new Date(msg[0].createdTimestamp),
								count: 1,
								game: 0,
								otherCount: 0,
								active: 1,
								assigned: []
							}]
						}
					}
				})
			if (!(await checkMemberRole(userN.id, message))) {
				console.log(`Adding ${userN.nickname ?? userN.user.username} (${userN.id}) to channel overrides.`)
				await merchChannelID.permissionOverwrites.create(userN.id, { ADD_REACTIONS: true })
			}
		} else {
			if (!merchRegex.test(message.content) || !arrIncludesString(disallowedWords, message.content) || !alreadyCalled(message, messages)) {
				console.log(`Old & Spam: ${userN.user.username} (${message.content})`, userN.user.id)
				if (message.guild.id === '668330890790699079') {
					const buttonMessageError = await botServerErrorChannel.send({ content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.user.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\`\`\``, components: [buttonSelection] })
					return await updateButtonData(db, message, userN, buttonMessageError)
				}
				await botServerErrorChannel.send({ content: ` \`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.user.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\`\`\`` })
				const buttonMessageError = await dsfServerErrorChannel.send({ content: ` \`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.user.id}>\n- User: ${userN.user.username}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\`\`\``, components: [buttonSelection] })
				return await updateButtonData(db, message, userN, buttonMessageError)
			}
			console.log(`Old: ${userN.user.username} (${message.content})`, findMessage.userID === userN.id, findMessage.userID, userN.id)
			await db.collection.updateOne({ _id: message.channel.guild.id, 'merchChannel.scoutTracker.userID': findMessage.userID }, {
				$inc: {
					'merchChannel.scoutTracker.$.count': 1
				},
				$set: {
					'merchChannel.scoutTracker.$.author': userN.nickname ?? userN.user.username,
					'merchChannel.scoutTracker.$.lastTimestamp': msg[0].createdTimestamp,
					'merchChannel.scoutTracker.$.lastTimestampReadable': new Date(msg[0].createdTimestamp),
					'merchChannel.scoutTracker.$.active': 1
				}
			})
			if (!(await checkMemberRole(userN.id, message))) {
				console.log(`Adding ${userN.user.username} (${userN.id}) to channel overrides.`)
				await merchChannelID.permissionOverwrites.create(userN.id, { ADD_REACTIONS: true })
			}
		}

		// Database logging for merch worlds
		let mes = await message.channel.messages.fetch({ limit: 10 })
		mes = mes.filter(m => {
			if (m.reactions.cache.has('☠️')) return undefined
			else return mes
		})
		const log = [...mes.values()]
		for (const msgs in log) {
			const authorName = log[msgs].member?.nickname ?? log[msgs].author.username
			const userId = log[msgs].member?.id ?? log[msgs].author.id
			if (authorName === null) return
			await db.collection.findOneAndUpdate({ _id: message.channel.guild.id },
				{
					$addToSet: {
						'merchChannel.messages': {
							$each: [{
								messageID: log[msgs].id,
								content: log[msgs].content,
								time: log[msgs].createdTimestamp,
								author: authorName,
								userID: userId
							}]
						},
						'merchChannel.spamProtection': {
							$each: [{
								messageID: log[msgs].id,
								content: log[msgs].content,
								time: log[msgs].createdTimestamp,
								author: authorName,
								userID: userId
							}]
						}
					}

				}
			)
		}
	} catch (err) {
		channels.errors.send(err)
	}
}

export default addMerchCount
