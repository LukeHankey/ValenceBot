import { MessageFlags } from 'discord.js'

export const contextMenu = async (client, interaction, data) => {
	const channels = await client.database.channels
	const dsfServerErrorChannel = client.channels.cache.get('884076361940078682')
	switch (interaction.commandName) {
		case 'Mark event as dead.':
			if ([data.merchChannel.channelID, data.merchChannel.otherChannelID].includes(interaction.channel.id)) {
				try {
					const message = await interaction.channel.messages.fetch(interaction.targetId)
					// 1st safeguard to check the cache.
					if (message.reactions.cache.has('☠️')) {
						return await interaction.editReply({
							content: 'This call is already marked as dead.',
							flags: MessageFlags.Ephemeral
						})
					}

					const reaction = await message.react('☠️')
					const userReactCollection = await reaction.users.fetch()
					const timestamp = interaction.createdAt.toString().split(' ').slice(0, 5).join(' ')

					if (userReactCollection.size > 1) {
						return await interaction.editReply({
							content: 'This call is already marked as dead.',
							flags: MessageFlags.Ephemeral
						})
					}

					await interaction.editReply({
						content: 'Thank you for marking this call as dead.',
						flags: MessageFlags.Ephemeral
					})
					dsfServerErrorChannel.send({
						content: `\`\`\`diff\n\n+ Reaction Added by ${interaction.member.displayName} - Content: ${message.content}\n- User ID: ${interaction.member.id}\n- Timestamp: ${timestamp}\`\`\``,
						flags: MessageFlags.Ephemeral
					})
				} catch (err) {
					if (err.code === 50001) {
						// Missing Access
						return await interaction.editReply({
							content: 'I am not able to access this channel.',
							flags: MessageFlags.Ephemeral
						})
					} else if (err.code === 90001) {
						// Reaction Blocked
						return await interaction.editReply({
							content: 'Unable to react. This person has blocked the bot.',
							flags: MessageFlags.Ephemeral
						})
					}
					client.logger.error('7: Error in mark event as dead.')
					channels.errors.send(err)
				}
			} else {
				interaction.editReply({ content: "You can't use that in this channel.", flags: MessageFlags.Ephemeral })
			}
			break
		case 'Affiliate Events': {
			client.logger.verbose(`${interaction.member.displayName} used Affiliate Events command.`)
			const role = interaction.guild.roles.cache.find((role) => role.name === 'Affiliate Events')
			if (interaction.channel.id !== '881320233627967508') {
				// extra-role-pings
				return await interaction.editReply({
					content: 'Please use the <#881320233627967508> channel.',
					flags: MessageFlags.Ephemeral
				})
			}
			await interaction.editReply({ content: 'Delete me.', flags: MessageFlags.Ephemeral })
			await interaction.channel.send({ content: `<@&${role.id}>` })
		}
	}
}
