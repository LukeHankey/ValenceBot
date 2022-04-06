export default {
	name: 'Mark event as dead.',
	description: 'Context menu which marks event calls as gone',
	type: 'menu',
	guildSpecific: ['420803245758480405', '668330890790699079'],
	permissionLevel: 'Everyone',
	data: {
		name: 'Mark event as dead.',
		type: 3
	},
	menu: async (interaction, db, data) => {
		const client = interaction.client
		const channels = await db.channels
		await interaction.deferReply({ ephemeral: true })
		if ([data.merchChannel.channelID, data.merchChannel.otherChannelID].includes(interaction.channel.id)) {
			try {
				const dsfServerErrorChannel = await client.channels.cache.get('884076361940078682')
				const message = interaction.channel.messages.cache.get(interaction.targetId)
				// 1st safeguard to check the cache.
				if (message.reactions.cache.has('☠️')) return await interaction.editReply({ content: 'This call is already marked as dead.' })

				const reaction = await message.react('☠️')
				const userReactCollection = await reaction.users.fetch()
				const timestamp = interaction.createdAt.toString().split(' ').slice(0, 5).join(' ')
				if (userReactCollection.size > 1) {
					return await interaction.editReply({ content: 'This call is already marked as dead.' })
				}
				await interaction.editReply({ content: 'Thank you for marking this call as dead.' })
				await dsfServerErrorChannel.send({ content: `\`\`\`diff\n\n+ Reaction Added by ${interaction.member.displayName} - Content: ${message.content}\n- User ID: ${interaction.member.id}\n- Timestamp: ${timestamp}\`\`\`` })
			} catch (err) {
				if (err.code === 50001) {
					// Missing Access
					return await interaction.editReply({ content: 'I am not able to access this channel.' })
				}
				await channels.errors.send(err)
			}
		} else {
			await interaction.editReply({ content: 'You can\'t use that in this channel.' })
		}
	}
}
