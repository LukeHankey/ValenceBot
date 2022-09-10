import { merchRegex } from '../constants.js'
import { checkMemberRole, arrIncludesString, alreadyCalled } from '../merchFunctions.js'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export const addMerchCount = async (client, message, db, scouter) => {
	const channels = await db.channels
	try {
		const { merchChannel: { channelID, messages }, disallowedWords } = await db.collection.findOne({ _id: message.guild.id }, { projection: { 'merchChannel.channelID': 1, 'merchChannel.messages': 1, disallowedWords: 1 } })
		const merchChannelID = client.channels.cache.get(channelID)
		const dsfServerErrorChannel = await client.channels.cache.get('794608385106509824')
		const botServerErrorChannel = await client.channels.cache.get('903432222139355207')

		// Adding count to members
		const mesOne = await message.channel.messages.fetch({ limit: 1 })
		const logOne = [...mesOne.values()]
		const msg = logOne.map(val => val)

		const userN = message.member
		const findMessage = await scouter.collection.findOne({ userID: userN.id })
		const timestamp = message.createdAt.toString().split(' ').slice(0, 5).join(' ')
		const buttonSelection = new ActionRowBuilder()
			.addComponents([
				new ButtonBuilder()
					.setCustomId(`DM ${userN.displayName}`)
					.setLabel(`DM ${userN.displayName}`)
					.setStyle(ButtonStyle.Primary)
					.setEmoji({ name: '✉️' }),
				new ButtonBuilder()
					.setCustomId('Show How To React')
					.setLabel('Show How To React')
					.setStyle(ButtonStyle.Success)
					.setEmoji({ name: '☠️' }),
				new ButtonBuilder()
					.setCustomId('Eyes on Merch Calls')
					.setLabel('Eyes on Merch Calls')
					.setStyle(ButtonStyle.Success)
					.setEmoji({ name: '👀' }),
				new ButtonBuilder()
					.setCustomId('Timeout')
					.setLabel('Timeout')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji({ name: '⏲️' }),
				new ButtonBuilder()
					.setCustomId('Clear Buttons')
					.setLabel('Clear Buttons')
					.setStyle(ButtonStyle.Danger)
					.setEmoji({ name: '❌' })
			])

		const buttonSelectionExtra = new ActionRowBuilder()
			.addComponents([
				new ButtonBuilder()
					.setCustomId('Too Slow!')
					.setLabel('Too Slow!')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji({ name: '🐌' })
			])

		if (!findMessage) {
			if (!merchRegex.test(message.content) || !arrIncludesString(disallowedWords, message.content) || !alreadyCalled(message, messages)) {
				if (message.guild.id === '668330890790699079') {
					return await botServerErrorChannel.send({ content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has not posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.displayName}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${merchChannelID.name}\`\`\``, components: [buttonSelection, buttonSelectionExtra] })
				}
				console.log(`New & Spam: ${userN.displayName} (${message.content})`, userN.id)
				return await dsfServerErrorChannel.send({ content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has not posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.displayName}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${merchChannelID.name}\`\`\``, components: [buttonSelection, buttonSelectionExtra] })
			}
			console.log(`New: ${userN.displayName} (${message.content})`, userN.id)
			await scouter.collection.insertOne({
				userID: userN.id,
				author: userN.nickname ?? userN.displayName,
				firstTimestamp: msg[0].createdTimestamp,
				firstTimestampReadable: new Date(msg[0].createdTimestamp),
				lastTimestamp: msg[0].createdTimestamp,
				lastTimestampReadable: new Date(msg[0].createdTimestamp),
				count: 1,
				game: 0,
				otherCount: 0,
				active: 1,
				assigned: []
			})
			if (!(await checkMemberRole(userN.id, message))) {
				console.log(`Adding ${userN.nickname ?? userN.displayName} (${userN.id}) to channel overrides.`)
				await merchChannelID.permissionOverwrites.create(userN.id, { AddReactions: true })
			}
		} else {
			if (!merchRegex.test(message.content) || !arrIncludesString(disallowedWords, message.content) || !alreadyCalled(message, messages)) {
				if (message.guild.id === '668330890790699079') {
					return await botServerErrorChannel.send({ content: `\`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.id}>\n- User: ${userN.displayName}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${merchChannelID.name}\`\`\``, components: [buttonSelection, buttonSelectionExtra] })
				}
				console.log(`Old & Spam: ${userN.displayName} (${message.content})`, userN.user.id)
				return await dsfServerErrorChannel.send({ content: ` \`\`\`diff\n+ Spam Message ${message.id} - (User has posted before)\n\n- User ID: <@!${userN.user.id}>\n- User: ${userN.displayName}\n- Content: ${message.content}\n- Timestamp: ${timestamp}\n- Channel: ${merchChannelID.name}\`\`\``, components: [buttonSelection, buttonSelectionExtra] })
			}
			console.log(`Old: ${userN.displayName} (${message.content})`, findMessage.userID === userN.id, findMessage.userID, userN.id)
			await scouter.collection.updateOne({ userID: findMessage.userID }, {
				$inc: {
					count: 1
				},
				$set: {
					author: userN.nickname ?? userN.displayName,
					lastTimestamp: msg[0].createdTimestamp,
					lastTimestampReadable: new Date(msg[0].createdTimestamp),
					active: 1
				}
			})
			if (!(await checkMemberRole(userN.id, message))) {
				console.log(`Adding ${userN.displayName} (${userN.id}) to channel overrides.`)
				await merchChannelID.permissionOverwrites.create(userN.id, { AddReactions: true })
			}
		}

		// Database logging for merch worlds
		let mes = await message.channel.messages.fetch({ limit: 10 })
		mes = mes.filter(m => !m.reactions.cache.has('☠️'))
		const log = [...mes.values()]
		for (const msgs in log) {
			const authorName = log[msgs].member?.displayName
			const userId = log[msgs].member?.id ?? log[msgs].author.id
			console.log(`Checking author name: ${authorName}`)
			if (!authorName || userId === '668330399033851924') return
			await db.collection.findOneAndUpdate({ _id: message.guild.id },
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
