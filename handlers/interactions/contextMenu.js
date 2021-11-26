export const contextMenu = async (interaction, data, db) => {
	const client = interaction.client
	const channels = await db.channels
	switch (interaction.commandName) {
	case 'Mark event as dead.':
		interaction.deferReply({ ephemeral: true })
		if ([data.merchChannel.channelID, data.merchChannel.otherChannelID].includes(interaction.channel.id)) {
			try {
				const dsfServerErrorChannel = await client.channels.cache.get('884076361940078682')
				const message = interaction.channel.messages.cache.get(interaction.targetId)
				const reaction = await message.react('☠️')
				const userReactCollection = await reaction.users.fetch()
				const timestamp = interaction.createdAt.toString().split(' ').slice(0, 5).join(' ')
				if (userReactCollection.size > 1) {
					return await interaction.editReply({ content: 'This call is already marked as dead.' })
				}
				await interaction.editReply({ content: 'Thank you for marking this call as dead.' })
				dsfServerErrorChannel.send({ content: `\`\`\`diff\n\n+ Reaction Added by ${interaction.member.displayName} - Content: ${message.content}\n- User ID: ${interaction.member.id}\n- Timestamp: ${timestamp}\`\`\`` })
			} catch (err) {
				if (err.code === 50001) {
					// Missing Access
					return await interaction.editReply({ content: 'I am not able to access this channel.' })
				}
				channels.errors.send(err)
			}
		} else {
			interaction.editReply({ content: 'You can\'t use that in this channel.' })
		}
		break
	case 'Affiliate Events': {
		const role = interaction.guild.roles.cache.find(role => role.name === 'Affiliate Events')
		const message = await interaction.reply({ content: `<@&${role.id}>`, fetchReply: true, allowedMentions: { roles: [role.id] } })
		await message.reply({ content: `<@&${role.id}>` })
	}
	}
}
