export const contextMenu = async (interaction, db, data) => {
	const client = interaction.client
	const channels = await db.channels
	const dsfServerErrorChannel = client.channels.cache.get('884076361940078682')
	switch (interaction.commandName) {
		case 'Mark event as dead.':
			if ([data.merchChannel.channelID, data.merchChannel.otherChannelID].includes(interaction.channel.id)) {
				try {
					client.logger.debug(1)
					const message = await interaction.channel.messages.fetch(interaction.targetId)
					client.logger.debug(2)
					// 1st safeguard to check the cache.
					if (message.reactions.cache.has('☠️')) {
						return await interaction.editReply({ content: 'This call is already marked as dead.', ephemeral: true })
					}
					client.logger.debug(3)

					const reaction = await message.react('☠️')
					const userReactCollection = await reaction.users.fetch()
					const timestamp = interaction.createdAt.toString().split(' ').slice(0, 5).join(' ')
					client.logger.debug(4)

					if (userReactCollection.size > 1) {
						return await interaction.editReply({ content: 'This call is already marked as dead.', ephemeral: true })
					}
					client.logger.debug(5)

					await interaction.editReply({ content: 'Thank you for marking this call as dead.', ephemeral: true })
					client.logger.debug(6)
					dsfServerErrorChannel.send({
						content: `\`\`\`diff\n\n+ Reaction Added by ${interaction.member.displayName} - Content: ${message.content}\n- User ID: ${interaction.member.id}\n- Timestamp: ${timestamp}\`\`\``,
						ephemeral: true
					})
					client.logger.debug(7)
				} catch (err) {
					if (err.code === 50001) {
						// Missing Access
						return await interaction.editReply({ content: 'I am not able to access this channel.', ephemeral: true })
					}
					client.logger.error('Error in mark event as dead.')
					channels.errors.send(err)
				}
			} else {
				interaction.editReply({ content: "You can't use that in this channel.", ephemeral: true })
			}
			break
		case 'Affiliate Events': {
			client.logger.verbose(`${interaction.member.displayName} used Affiliate Events command.`)
			const role = interaction.guild.roles.cache.find((role) => role.name === 'Affiliate Events')
			if (interaction.channel.id !== '881320233627967508') {
				// extra-role-pings
				return await interaction.editReply({ content: 'Please use the <#881320233627967508> channel.', ephemeral: true })
			}
			await interaction.editReply({ content: 'Delete me.', ephemeral: true })
			await interaction.channel.send({ content: `<@&${role.id}>` })
		}
	}
}
